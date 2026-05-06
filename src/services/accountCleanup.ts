import { prayerTimesRepository } from '@/services/prayer/PrayerTimesRepository';
import { secureSession, secureValueStore, storage } from '@/services/storage';
import { useAuthStore } from '@/state/authStore';
import { useKhatmaStore } from '@/state/khatmaStore';
import { usePrayerStore } from '@/state/prayerStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useTasbeehStore } from '@/state/tasbeehStore';

const NOTIFICATION_STATE_KEY = 'noor.notifications.runtime.v2';

const removeInstallScopedPersistedStorage = async () => {
  await Promise.all([
    storage.removeItem(storage.keys.khatmaStore),
    storage.removeItem(storage.keys.prayerStore),
    storage.removeItem(storage.keys.settingsStore),
    storage.removeItem(storage.keys.tasbeehStore),
    storage.removeItem(storage.keys.syncQueue),
    storage.removeItem(storage.keys.installMarker),
    storage.removeItem(NOTIFICATION_STATE_KEY),
    storage.securePersistStorage.removeItem(storage.keys.authStore),
    secureValueStore.remove(storage.keys.deviceId),
    secureValueStore.remove(storage.keys.installFingerprint),
  ]);
};

export const clearAccountScopedData = async () => {
  await secureSession.clearTokens();
  useAuthStore.getState().logout();
  useKhatmaStore.getState().resetAccountScopedData();
  useSettingsStore.getState().resetAccountScopedData();
  usePrayerStore.getState().resetAccountScopedData();
  await prayerTimesRepository.clearAll();
  await storage.removeItem(NOTIFICATION_STATE_KEY);

  try {
    const { notificationService } = await import('@/services/notificationService');
    await notificationService.clearAccountScopedNotifications();
  } catch {
    // Best effort cleanup only.
  }
};

export const clearInstallScopedData = async () => {
  await secureSession.clearTokens();
  await removeInstallScopedPersistedStorage();
  useAuthStore.getState().resetPersistentState();
  useKhatmaStore.getState().resetAccountScopedData();
  useSettingsStore.getState().resetPersistentState();
  usePrayerStore.getState().resetAccountScopedData();
  useTasbeehStore.getState().resetPersistentState();
  await prayerTimesRepository.clearAll();
  await storage.removeItem(NOTIFICATION_STATE_KEY);

  try {
    const { notificationService } = await import('@/services/notificationService');
    await notificationService.clearAccountScopedNotifications();
  } catch {
    // Best effort cleanup only.
  }
};
