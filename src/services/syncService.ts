import NetInfo from '@react-native-community/netinfo';
import { syncApi } from '@/api/syncApi';
import { useAuthStore } from '@/state/authStore';
import { useKhatmaStore } from '@/state/khatmaStore';
import { useSettingsStore } from '@/state/settingsStore';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';
import { usePrayerStore } from '@/state/prayerStore';
import { settingsRepository } from '@/services/prayer/SettingsRepository';

export const syncService = {
  syncNow: async () => {
    const { isConnected } = await NetInfo.fetch();
    const auth = useAuthStore.getState();

    if (!isConnected || !auth.isAuthenticated || !auth.user) {
      return { synced: false, reason: 'offline_or_guest' as const };
    }

    const khatmaStore = useKhatmaStore.getState();
    const settingsStore = useSettingsStore.getState();
    const prayerStore = usePrayerStore.getState();

    const merged = await syncApi.pushPull({
      khatma: khatmaStore.activeKhatma ?? undefined,
      readingProgress: khatmaStore.readingProgress,
      bookmarks: khatmaStore.bookmarks,
      prayerSettings: settingsStore.prayerSettings,
      reminders: settingsStore.reminders,
      localUpdatedAt: new Date().toISOString(),
      syncMetadata: {
        ...khatmaStore.syncMetadata,
        ...settingsStore.syncMetadata,
      },
    });

    if (merged.khatma) {
      useKhatmaStore.setState({
        activeKhatma: merged.khatma,
        syncMetadata: {
          ...useKhatmaStore.getState().syncMetadata,
          khatmaUpdatedAt:
            merged.syncMetadata?.khatmaUpdatedAt ?? merged.khatma.updatedAt ?? new Date().toISOString(),
        },
      });
    }
    if (merged.readingProgress) {
      useKhatmaStore.setState({
        readingProgress: merged.readingProgress,
        syncMetadata: {
          ...useKhatmaStore.getState().syncMetadata,
          readingProgressUpdatedAt:
            merged.syncMetadata?.readingProgressUpdatedAt ??
            merged.readingProgress.updatedAt ??
            new Date().toISOString(),
        },
      });
    }
    if (merged.bookmarks) {
      useKhatmaStore.setState({
        bookmarks: merged.bookmarks,
        syncMetadata: {
          ...useKhatmaStore.getState().syncMetadata,
          bookmarksUpdatedAt:
            merged.syncMetadata?.bookmarksUpdatedAt ??
            merged.bookmarks[0]?.updatedAt ??
            new Date().toISOString(),
        },
      });
    }
    if (merged.prayerSettings) {
      const normalizedPrayerSettings = settingsRepository.replacePrayerSettings(merged.prayerSettings);
      useSettingsStore.setState({
        syncMetadata: {
          ...useSettingsStore.getState().syncMetadata,
          prayerSettingsUpdatedAt:
            merged.syncMetadata?.prayerSettingsUpdatedAt ??
            normalizedPrayerSettings.updatedAt ??
            new Date().toISOString(),
        },
      });
    }
    if (merged.reminders) {
      useSettingsStore.setState({
        reminders: merged.reminders,
        syncMetadata: {
          ...useSettingsStore.getState().syncMetadata,
          remindersUpdatedAt: merged.syncMetadata?.remindersUpdatedAt ?? new Date().toISOString(),
        },
      });
    }

    await prayerRuntime.requestRepair('account_sync_restored', {
      allowLocationRefresh:
        (merged.prayerSettings ?? settingsStore.prayerSettings).locationMode !== 'manual',
      forceNotificationResync: true,
    });

    if (prayerStore.runtimeHealth.state === 'degraded') {
      usePrayerStore.setState({
        runtimeHealth: {
          ...prayerStore.runtimeHealth,
          state: 'attention',
        },
      });
    }

    return { synced: true };
  },
};
