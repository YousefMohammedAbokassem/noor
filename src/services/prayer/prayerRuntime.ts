import * as BackgroundTask from 'expo-background-task';
import { notificationService } from '@/services/notificationService';
import { locationService } from '@/services/locationService';
import { scheduleRepairService } from '@/services/prayer/ScheduleRepairService';
import { settingsRepository } from '@/services/prayer/SettingsRepository';
import { prayerLogger } from '@/services/prayer/logger';
import { PRAYER_REPAIR_TASK_NAME } from '@/background/prayerRepairTask';
import { PrayerSettings } from '@/types/models';

const BACKGROUND_INTERVAL_MINUTES = 15;
const locationRefreshPatchKeys: Array<keyof PrayerSettings> = [
  'locationMode',
  'city',
  'country',
  'countryCode',
  'latitude',
  'longitude',
  'timeZone',
  'locationLabel',
  'locationSource',
  'locationUpdatedAt',
  'presetCityId',
];

const shouldAllowLocationRefreshForPatch = (patch: Partial<PrayerSettings>) =>
  locationRefreshPatchKeys.some((key) => key in patch) && patch.locationMode !== 'manual';

class PrayerRuntime {
  private initialized = false;

  async initialize() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    const lang = settingsRepository.getLanguage();
    await notificationService.prepareRuntime(lang);

    try {
      const status = await BackgroundTask.getStatusAsync();
      if (status === BackgroundTask.BackgroundTaskStatus.Available) {
        await BackgroundTask.registerTaskAsync(PRAYER_REPAIR_TASK_NAME, {
          minimumInterval: BACKGROUND_INTERVAL_MINUTES,
        });
        scheduleRepairService.setBackgroundTaskRegistered(true);
      } else {
        scheduleRepairService.setBackgroundTaskRegistered(false);
      }
    } catch (error) {
      scheduleRepairService.setBackgroundTaskRegistered(false);
      prayerLogger.warn('Background repair task registration failed', error);
    }

    await scheduleRepairService.repairNow('app_boot', {
      allowLocationRefresh: true,
    });
  }

  requestRepair(reason: string, options?: { allowLocationRefresh?: boolean; forceNotificationResync?: boolean }) {
    return scheduleRepairService.requestRepair(reason, options);
  }

  async refreshAutoLocation() {
    const granted = await locationService.requestPermission();
    settingsRepository.setLocationGranted(granted);

    if (!granted) {
      throw new Error('location_permission_denied');
    }

    const snapshot = await locationService.resolveAutoPrayerLocation();
    settingsRepository.savePrayerSettings({
      ...snapshot,
      locationMode: 'auto',
    });

    return scheduleRepairService.repairNow('location_changed', {
      allowLocationRefresh: false,
      forceNotificationResync: true,
    });
  }

  async updatePrayerSettings(patch: Partial<PrayerSettings>, reason = 'settings_changed') {
    settingsRepository.savePrayerSettings(patch);
    return scheduleRepairService.requestRepair(reason, {
      allowLocationRefresh: shouldAllowLocationRefreshForPatch(patch),
      forceNotificationResync: true,
    });
  }
}

export const prayerRuntime = new PrayerRuntime();
