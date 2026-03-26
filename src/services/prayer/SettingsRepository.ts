import { useAuthStore } from '@/state/authStore';
import { useSettingsStore } from '@/state/settingsStore';
import { usePrayerStore } from '@/state/prayerStore';
import { PrayerRuntimeHealth, PrayerSettings, PrayerTimes, ReminderSetting } from '@/types/models';
import { normalizePrayerSettings } from '@/services/prayer/defaults';

export class SettingsRepository {
  getPrayerSettings(): PrayerSettings {
    return normalizePrayerSettings(useSettingsStore.getState().prayerSettings);
  }

  savePrayerSettings(patch: Partial<PrayerSettings>): PrayerSettings {
    const current = this.getPrayerSettings();
    const next = normalizePrayerSettings({
      ...current,
      ...patch,
    });
    useSettingsStore.getState().setPrayerSettings(next);
    return next;
  }

  replacePrayerSettings(next: PrayerSettings): PrayerSettings {
    const normalized = normalizePrayerSettings(next);
    useSettingsStore.setState({
      prayerSettings: normalized,
      syncMetadata: {
        ...useSettingsStore.getState().syncMetadata,
        prayerSettingsUpdatedAt: normalized.updatedAt ?? useSettingsStore.getState().syncMetadata.prayerSettingsUpdatedAt,
      },
    });
    return normalized;
  }

  getReminders(): ReminderSetting[] {
    return useSettingsStore.getState().reminders;
  }

  getDhikrLoopSettings() {
    return useSettingsStore.getState().dhikrLoopSettings;
  }

  getLanguage() {
    return useAuthStore.getState().language;
  }

  setPrayerTimes(prayerTimes: PrayerTimes) {
    usePrayerStore.setState({ prayerTimes });
  }

  setLocationGranted(granted: boolean) {
    usePrayerStore.setState({ isLocationGranted: granted });
  }

  setRuntimeHealth(runtimeHealth: PrayerRuntimeHealth) {
    usePrayerStore.setState({ runtimeHealth });
  }
}

export const settingsRepository = new SettingsRepository();
