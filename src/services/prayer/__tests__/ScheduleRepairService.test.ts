import { addDaysToDateKey } from '@/services/prayer/dateTime';
import { defaultPrayerSettings } from '@/services/prayer/defaults';
import { ScheduleRepairService } from '@/services/prayer/ScheduleRepairService';
import { DhikrLoopSettings, PrayerDaySchedule, PrayerRuntimeHealth, PrayerSettings, PrayerTimes, ReminderSetting } from '@/types/models';

jest.mock('@/services/notificationService', () => ({
  notificationService: {
    getPermissionSnapshot: jest.fn(),
    syncSupplementalNotifications: jest.fn(),
    ensureAdhanSchedule: jest.fn(),
    clearAccountScopedNotifications: jest.fn(),
  },
}));

jest.mock('@/services/locationService', () => ({
  locationService: {
    getPermissionStatus: jest.fn(),
    getCurrentTimeZone: jest.fn(),
    resolveAutoPrayerLocation: jest.fn(),
    resolveTimeZoneForCoordinates: jest.fn(),
  },
}));

const { notificationService } = jest.requireMock('@/services/notificationService') as {
  notificationService: {
    getPermissionSnapshot: jest.Mock;
    syncSupplementalNotifications: jest.Mock;
    ensureAdhanSchedule: jest.Mock;
    clearAccountScopedNotifications: jest.Mock;
  };
};

const { locationService } = jest.requireMock('@/services/locationService') as {
  locationService: {
    getPermissionStatus: jest.Mock;
    getCurrentTimeZone: jest.Mock;
    resolveAutoPrayerLocation: jest.Mock;
    resolveTimeZoneForCoordinates: jest.Mock;
  };
};

class InMemorySettingsRepository {
  settings: PrayerSettings;
  prayerTimes: PrayerTimes | null = null;
  runtimeHealth: PrayerRuntimeHealth | null = null;
  locationGranted = false;
  reminders: ReminderSetting[] = [];
  dhikrLoopSettings: DhikrLoopSettings = {
    enabled: false,
    intervalMinutes: 30,
  };
  language: 'ar' | 'en' = 'en';

  constructor(overrides: Partial<PrayerSettings> = {}) {
    this.settings = {
      ...defaultPrayerSettings,
      ...overrides,
      prayerNotifications: {
        ...defaultPrayerSettings.prayerNotifications,
        ...(overrides.prayerNotifications ?? {}),
      },
    };
  }

  getPrayerSettings() {
    return this.settings;
  }

  savePrayerSettings(patch: Partial<PrayerSettings>) {
    this.settings = {
      ...this.settings,
      ...patch,
      prayerNotifications: {
        ...this.settings.prayerNotifications,
        ...(patch.prayerNotifications ?? {}),
      },
    };
    return this.settings;
  }

  getReminders() {
    return this.reminders;
  }

  getDhikrLoopSettings() {
    return this.dhikrLoopSettings;
  }

  getLanguage() {
    return this.language;
  }

  setPrayerTimes(prayerTimes: PrayerTimes) {
    this.prayerTimes = prayerTimes;
  }

  setLocationGranted(granted: boolean) {
    this.locationGranted = granted;
  }

  setRuntimeHealth(runtimeHealth: PrayerRuntimeHealth) {
    this.runtimeHealth = runtimeHealth;
  }
}

class InMemoryPrayerRepository {
  prayerDays: PrayerDaySchedule[] = [];
  repairState: Record<string, unknown> = {};

  async getPrayerDays() {
    return this.prayerDays;
  }

  async upsertPrayerDays(days: PrayerDaySchedule[]) {
    const nextByDate = new Map(this.prayerDays.map((day) => [day.date, day]));
    for (const day of days) {
      nextByDate.set(day.date, day);
    }
    this.prayerDays = Array.from(nextByDate.values()).sort((left, right) => left.date.localeCompare(right.date));
  }

  async replacePrayerDays(days: PrayerDaySchedule[]) {
    this.prayerDays = [...days];
  }

  async getRepairState() {
    return this.repairState;
  }

  async setRepairState(patch: Record<string, unknown>) {
    this.repairState = {
      ...this.repairState,
      ...patch,
    };
  }
}

describe('ScheduleRepairService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-25T03:00:00Z'));
    jest.clearAllMocks();

    locationService.getPermissionStatus.mockResolvedValue(true);
    locationService.getCurrentTimeZone.mockReturnValue('Asia/Damascus');
    locationService.resolveTimeZoneForCoordinates.mockReturnValue('Asia/Damascus');
    locationService.resolveAutoPrayerLocation.mockResolvedValue({
      latitude: 33.5138,
      longitude: 36.2765,
      city: 'Damascus',
      country: 'Syria',
      countryCode: 'SY',
      timeZone: 'Asia/Damascus',
      locationLabel: 'Damascus',
      locationUpdatedAt: '2026-03-25T03:00:00.000Z',
      locationSource: 'gps',
    });

    notificationService.getPermissionSnapshot.mockResolvedValue({
      granted: true,
      status: 'granted',
    });
    notificationService.syncSupplementalNotifications.mockResolvedValue(true);
    notificationService.ensureAdhanSchedule.mockResolvedValue({
      granted: true,
      scheduledCount: 25,
      scheduledUntil: '2026-04-23',
      truncated: false,
    });
    notificationService.clearAccountScopedNotifications.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hydrates missing cache and schedules adhan notifications on first boot', async () => {
    const settingsRepo = new InMemorySettingsRepository({
      locationMode: 'auto',
    });
    const prayerRepo = new InMemoryPrayerRepository();
    const service = new ScheduleRepairService(settingsRepo as never, prayerRepo as never);
    service.setBackgroundTaskRegistered(true);

    const health = await service.repairNow('app_boot', {
      allowLocationRefresh: true,
    });

    expect(health.state).toBe('ready');
    expect(prayerRepo.prayerDays).toHaveLength(60);
    expect(settingsRepo.prayerTimes?.date).toBe('2026-03-25');
    expect(settingsRepo.prayerTimes?.cityName).toBe('Damascus');
    expect(notificationService.ensureAdhanSchedule).toHaveBeenCalled();
    expect(health.cacheEndDate).toBe(addDaysToDateKey('2026-03-25', 59));
  });

  it('survives an app restart by reusing cached days from storage', async () => {
    const settingsRepo = new InMemorySettingsRepository({
      locationMode: 'auto',
    });
    const prayerRepo = new InMemoryPrayerRepository();
    const firstService = new ScheduleRepairService(settingsRepo as never, prayerRepo as never);
    firstService.setBackgroundTaskRegistered(true);

    await firstService.repairNow('app_boot', {
      allowLocationRefresh: true,
    });

    const daysAfterFirstBoot = prayerRepo.prayerDays.length;
    const restartedService = new ScheduleRepairService(settingsRepo as never, prayerRepo as never);
    restartedService.setBackgroundTaskRegistered(true);

    const health = await restartedService.repairNow('app_restart', {
      allowLocationRefresh: false,
    });

    expect(prayerRepo.prayerDays).toHaveLength(daysAfterFirstBoot);
    expect(health.cacheStartDate).toBe('2026-03-25');
    expect(settingsRepo.prayerTimes?.source).toBe('cache');
  });

  it('recalculates prayer cache and forces rescheduling when settings change', async () => {
    const settingsRepo = new InMemorySettingsRepository({
      locationMode: 'manual',
      latitude: 33.5138,
      longitude: 36.2765,
      city: 'Damascus',
      country: 'Syria',
      timeZone: 'Asia/Damascus',
      locationLabel: 'Damascus',
    });
    const prayerRepo = new InMemoryPrayerRepository();
    const service = new ScheduleRepairService(settingsRepo as never, prayerRepo as never);
    service.setBackgroundTaskRegistered(true);

    await service.repairNow('app_boot', {
      allowLocationRefresh: false,
    });
    const firstFajr = settingsRepo.prayerTimes?.fajr;

    settingsRepo.savePrayerSettings({ calculationMethod: 'muslim_world_league' });
    await service.repairNow('settings_changed', {
      allowLocationRefresh: false,
      forceNotificationResync: true,
    });

    expect(settingsRepo.prayerTimes?.fajr).not.toBe(firstFajr);
    expect(notificationService.ensureAdhanSchedule).toHaveBeenLastCalledWith(
      expect.objectContaining({
        force: true,
      }),
    );
  });

  it('updates the stored timezone and reschedules when timezone changes while offline', async () => {
    const settingsRepo = new InMemorySettingsRepository({
      locationMode: 'auto',
    });
    const prayerRepo = new InMemoryPrayerRepository();
    const service = new ScheduleRepairService(settingsRepo as never, prayerRepo as never);
    service.setBackgroundTaskRegistered(true);

    await service.repairNow('app_boot', {
      allowLocationRefresh: true,
    });

    locationService.getCurrentTimeZone.mockReturnValue('Europe/Istanbul');
    locationService.resolveTimeZoneForCoordinates.mockReturnValue('Europe/Istanbul');
    locationService.resolveAutoPrayerLocation.mockResolvedValue({
      latitude: 33.5138,
      longitude: 36.2765,
      city: 'Damascus',
      country: 'Syria',
      countryCode: 'SY',
      timeZone: 'Europe/Istanbul',
      locationLabel: 'Damascus',
      locationUpdatedAt: '2026-03-26T03:00:00.000Z',
      locationSource: 'gps',
    });

    const health = await service.repairNow('timezone_changed', {
      allowLocationRefresh: true,
      forceNotificationResync: true,
    });

    expect(settingsRepo.settings.timeZone).toBe('Europe/Istanbul');
    expect(health.notificationPermissionGranted).toBe(true);
    expect(notificationService.ensureAdhanSchedule).toHaveBeenLastCalledWith(
      expect.objectContaining({
        force: true,
      }),
    );
  });

  it('prefers the timezone derived from the saved coordinates over the simulator/device timezone', async () => {
    const settingsRepo = new InMemorySettingsRepository({
      locationMode: 'auto',
      latitude: 33.5138,
      longitude: 36.2765,
      city: 'Damascus',
      country: 'Syria',
      timeZone: 'America/Los_Angeles',
      locationLabel: 'Damascus',
      locationUpdatedAt: '2026-03-25T03:00:00.000Z',
      locationSource: 'gps',
    });
    const prayerRepo = new InMemoryPrayerRepository();
    const service = new ScheduleRepairService(settingsRepo as never, prayerRepo as never);
    service.setBackgroundTaskRegistered(true);

    locationService.getCurrentTimeZone.mockReturnValue('America/Los_Angeles');
    locationService.resolveTimeZoneForCoordinates.mockReturnValue('Asia/Damascus');

    await service.repairNow('cached_location_timezone_fix', {
      allowLocationRefresh: false,
      forceNotificationResync: true,
    });

    expect(settingsRepo.settings.timeZone).toBe('Asia/Damascus');
  });

  it('clears scheduled notifications and reports attention when notification permission is disabled', async () => {
    const settingsRepo = new InMemorySettingsRepository({
      locationMode: 'manual',
      latitude: 33.5138,
      longitude: 36.2765,
      city: 'Damascus',
      country: 'Syria',
      timeZone: 'Asia/Damascus',
      locationLabel: 'Damascus',
    });
    const prayerRepo = new InMemoryPrayerRepository();
    const service = new ScheduleRepairService(settingsRepo as never, prayerRepo as never);
    service.setBackgroundTaskRegistered(true);

    notificationService.getPermissionSnapshot.mockResolvedValue({
      granted: false,
      status: 'denied',
      canAskAgain: false,
    });

    const health = await service.repairNow('notification_permission_revoked', {
      allowLocationRefresh: false,
      forceNotificationResync: true,
    });

    expect(notificationService.clearAccountScopedNotifications).toHaveBeenCalledTimes(1);
    expect(notificationService.syncSupplementalNotifications).not.toHaveBeenCalled();
    expect(notificationService.ensureAdhanSchedule).not.toHaveBeenCalled();
    expect(health.notificationPermissionGranted).toBe(false);
    expect(health.issues).toContain('notification_permission_missing');
    expect(health.state).toBe('attention');
  });
});
