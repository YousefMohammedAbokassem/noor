import { prayerTimesRepository } from '@/services/prayer/PrayerTimesRepository';
import { secureSession, storage } from '@/services/storage';
import { useAuthStore } from '@/state/authStore';
import { useKhatmaStore } from '@/state/khatmaStore';
import { usePrayerStore } from '@/state/prayerStore';
import { useSettingsStore } from '@/state/settingsStore';

const NOTIFICATION_STATE_KEY = 'noor.notifications.runtime.v2';

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
  useAuthStore.getState().resetPersistentState();
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
