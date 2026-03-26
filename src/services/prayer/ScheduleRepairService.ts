import { notificationService } from '@/services/notificationService';
import { locationService } from '@/services/locationService';
import { prayerService } from '@/services/prayerService';
import { PrayerTimesRepository, prayerTimesRepository } from '@/services/prayer/PrayerTimesRepository';
import { SettingsRepository, settingsRepository } from '@/services/prayer/SettingsRepository';
import { addDaysToDateKey, getDateKeyInTimeZone } from '@/services/prayer/dateTime';
import {
  buildCalculationFingerprint,
  buildLocationFingerprint,
} from '@/services/prayer/fingerprints';
import { prayerLogger } from '@/services/prayer/logger';
import { PrayerRuntimeHealth, PrayerRuntimeIssue } from '@/types/models';

const CACHE_WINDOW_DAYS = 60;

type RepairOptions = {
  allowLocationRefresh?: boolean;
  forceNotificationResync?: boolean;
};

const uniqueIssues = (issues: PrayerRuntimeIssue[]) => Array.from(new Set(issues));

export class ScheduleRepairService {
  private queue: Promise<PrayerRuntimeHealth | null> = Promise.resolve(null);
  private pendingRequest:
    | {
        promise: Promise<PrayerRuntimeHealth>;
        resolve: (value: PrayerRuntimeHealth) => void;
        reject: (reason?: unknown) => void;
        reasons: Set<string>;
        options: RepairOptions;
        timer: ReturnType<typeof setTimeout>;
      }
    | null = null;

  private backgroundTaskRegistered = false;

  constructor(
    private readonly settingsRepo: SettingsRepository,
    private readonly prayerRepo: PrayerTimesRepository,
  ) {}

  setBackgroundTaskRegistered(value: boolean) {
    this.backgroundTaskRegistered = value;
  }

  requestRepair(reason: string, options: RepairOptions = {}) {
    if (this.pendingRequest) {
      this.pendingRequest.reasons.add(reason);
      this.pendingRequest.options = {
        allowLocationRefresh:
          this.pendingRequest.options.allowLocationRefresh !== false &&
          options.allowLocationRefresh !== false,
        forceNotificationResync:
          this.pendingRequest.options.forceNotificationResync === true ||
          options.forceNotificationResync === true,
      };
      return this.pendingRequest.promise;
    }

    let resolvePromise: (value: PrayerRuntimeHealth) => void = () => undefined;
    let rejectPromise: (reason?: unknown) => void = () => undefined;
    const promise = new Promise<PrayerRuntimeHealth>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const timer = setTimeout(() => {
      const request = this.pendingRequest;
      if (!request) return;
      this.pendingRequest = null;

      const mergedReason = Array.from(request.reasons).join(',');
      this.queue = this.queue
        .then(
          () => this.repairNow(mergedReason, request.options),
          () => this.repairNow(mergedReason, request.options),
        )
        .then((result) => {
          request.resolve(result);
          return result;
        })
        .catch((error) => {
          request.reject(error);
          throw error;
        });
    }, 250);

    this.pendingRequest = {
      promise,
      resolve: resolvePromise,
      reject: rejectPromise,
      reasons: new Set([reason]),
      options,
      timer,
    };

    return promise;
  }

  async repairNow(reason: string, options: RepairOptions = {}) {
    const issues: PrayerRuntimeIssue[] = [];
    const lang = this.settingsRepo.getLanguage();
    let settings = this.settingsRepo.getPrayerSettings();
    let locationPermissionGranted: boolean | null =
      settings.locationMode === 'auto'
        ? await locationService.getPermissionStatus().catch(() => false)
        : null;

    if (settings.locationMode === 'auto') {
      this.settingsRepo.setLocationGranted(locationPermissionGranted === true);
      const deviceTimeZone = locationService.getCurrentTimeZone();

      if (settings.timeZone !== deviceTimeZone) {
        settings = this.settingsRepo.savePrayerSettings({ timeZone: deviceTimeZone });
      }

      if (locationPermissionGranted) {
        if (options.allowLocationRefresh !== false) {
          try {
            const snapshot = await locationService.resolveAutoPrayerLocation();
            settings = this.settingsRepo.savePrayerSettings({
              ...snapshot,
              locationMode: 'auto',
            });
          } catch (error) {
            prayerLogger.warn('Using cached auto location because live refresh failed', error);
            issues.push('using_cached_location');
          }
        }
      } else {
        issues.push('location_permission_missing');
      }
    }

    const timeZone = prayerService.resolveTimeZone(settings);
    if (!settings.timeZone || settings.timeZone !== timeZone) {
      settings = this.settingsRepo.savePrayerSettings({ timeZone });
    }

    const now = new Date();
    const todayKey = getDateKeyInTimeZone(now, timeZone);
    const keepFromDate = addDaysToDateKey(todayKey, -1);
    const keepToDate = addDaysToDateKey(todayKey, CACHE_WINDOW_DAYS - 1);
    const calcFingerprint = buildCalculationFingerprint(settings);
    const locationFingerprint = buildLocationFingerprint(settings, timeZone);

    const cachedDays = (await this.prayerRepo.getPrayerDays()).filter(
      (day) =>
        day.date >= keepFromDate &&
        day.date <= keepToDate &&
        day.calculationFingerprint === calcFingerprint &&
        day.locationFingerprint === locationFingerprint,
    );

    const byDate = new Map<string, typeof cachedDays[number]>(
      cachedDays.map((day) => [day.date, { ...day, source: 'cache' as const }]),
    );
    const missingDates: string[] = [];

    if (typeof settings.latitude !== 'number' || typeof settings.longitude !== 'number') {
      issues.push(locationPermissionGranted === false ? 'location_permission_missing' : 'location_unavailable');
    } else {
      for (let offset = 0; offset < CACHE_WINDOW_DAYS; offset += 1) {
        const dateKey = addDaysToDateKey(todayKey, offset);
        if (!byDate.has(dateKey)) {
          missingDates.push(dateKey);
        }
      }

      if (missingDates.length > 0) {
        const generatedDays = missingDates.map((dateKey) => prayerService.buildPrayerDay(dateKey, settings));
        await this.prayerRepo.upsertPrayerDays(generatedDays);
        for (const day of generatedDays) {
          byDate.set(day.date, day);
        }
      }
    }

    const nextDays = Array.from(byDate.values())
      .filter((day) => day.date >= todayKey && day.date <= keepToDate)
      .sort((left, right) => left.date.localeCompare(right.date));

    await this.prayerRepo.replacePrayerDays(
      Array.from(byDate.values())
        .filter((day) => day.date >= keepFromDate && day.date <= keepToDate)
        .sort((left, right) => left.date.localeCompare(right.date)),
    );

    const today = nextDays.find((day) => day.date === todayKey);
    if (!today) {
      issues.push('cache_missing');
    } else {
      this.settingsRepo.setPrayerTimes(
        prayerService.toPrayerTimes(today, today.source === 'cache' ? 'cache' : 'fresh'),
      );
    }

    const permissionSnapshot = await notificationService.getPermissionSnapshot();
    let scheduledCount = 0;
    let scheduledUntil: string | undefined;

    await notificationService.syncSupplementalNotifications({
      reminders: this.settingsRepo.getReminders(),
      dhikrLoopSettings: this.settingsRepo.getDhikrLoopSettings(),
      lang,
    });

    if (!permissionSnapshot.granted) {
      issues.push('notification_permission_missing');
    } else if (nextDays.length > 0) {
      const adhanSchedule = await notificationService.ensureAdhanSchedule({
        days: nextDays,
        settings,
        lang,
        now,
        force: options.forceNotificationResync === true,
      });
      scheduledCount = adhanSchedule.scheduledCount;
      scheduledUntil = adhanSchedule.scheduledUntil;

      if (scheduledCount === 0) {
        issues.push('notifications_missing');
      }

      if (adhanSchedule.truncated) {
        issues.push('notification_window_truncated');
      }
    }

    if (!this.backgroundTaskRegistered) {
      issues.push('background_task_unavailable');
    }

    const healthIssues = uniqueIssues(issues);
    const health: PrayerRuntimeHealth = {
      state:
        healthIssues.length === 0
          ? 'ready'
          : healthIssues.includes('cache_missing') || healthIssues.includes('notifications_missing')
            ? 'degraded'
            : 'attention',
      lastRepairAt: now.toISOString(),
      lastRepairReason: reason,
      cacheStartDate: nextDays[0]?.date,
      cacheEndDate: nextDays.at(-1)?.date,
      scheduledUntil,
      scheduledCount,
      notificationPermissionGranted: permissionSnapshot.granted,
      locationPermissionGranted,
      backgroundTaskRegistered: this.backgroundTaskRegistered,
      issues: healthIssues,
    };

    this.settingsRepo.setRuntimeHealth(health);
    await this.prayerRepo.setRepairState({
      lastRepairAt: health.lastRepairAt,
      lastRepairReason: reason,
      lastKnownTimeZone: timeZone,
      lastKnownUtcOffsetMinutes: today?.utcOffsetMinutes,
      scheduledUntil,
      scheduledCount,
    });

    prayerLogger.info('Schedule repair completed', {
      reason,
      cacheEndDate: health.cacheEndDate,
      scheduledUntil,
      scheduledCount,
      issues: healthIssues,
    });

    return health;
  }
}

export const scheduleRepairService = new ScheduleRepairService(
  settingsRepository,
  prayerTimesRepository,
);
