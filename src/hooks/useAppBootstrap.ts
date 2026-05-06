import { useEffect, useState } from 'react';
import { setLanguage } from '@/i18n';
import { useAuthStore } from '@/state/authStore';
import { useKhatmaStore } from '@/state/khatmaStore';
import { usePrayerStore } from '@/state/prayerStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useTasbeehStore } from '@/state/tasbeehStore';
import { secureSession, secureValueStore, storage } from '@/services/storage';
import { clearAccountScopedData, clearInstallScopedData } from '@/services/accountCleanup';

type PersistStore = {
  persist?: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
};

type InstallMarker = {
  installationId: string;
  installedAt: string;
};

const waitForPersistHydration = async (store: PersistStore) => {
  const persistApi = store.persist;
  if (!persistApi || persistApi.hasHydrated()) {
    return;
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = persistApi.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
};

const buildInstallMarker = (): InstallMarker => ({
  installationId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  installedAt: new Date().toISOString(),
});

export const useAppBootstrap = () => {
  const [isReady, setReady] = useState(false);
  const language = useAuthStore((s) => s.language);

  useEffect(() => {
    const run = async () => {
      try {
        await Promise.all([
          waitForPersistHydration(useAuthStore as PersistStore),
          waitForPersistHydration(useSettingsStore as PersistStore),
          waitForPersistHydration(usePrayerStore as PersistStore),
          waitForPersistHydration(useKhatmaStore as PersistStore),
          waitForPersistHydration(useTasbeehStore as PersistStore),
        ]);

        const installMarker = await storage.getItem<InstallMarker>(storage.keys.installMarker);
        const secureInstallFingerprint = await secureValueStore.getString(storage.keys.installFingerprint);
        const installMarkerInvalid =
          !installMarker ||
          typeof installMarker.installationId !== 'string' ||
          installMarker.installationId.length < 8 ||
          secureInstallFingerprint !== installMarker.installationId;

        if (installMarkerInvalid) {
          await clearInstallScopedData();
          const nextInstallMarker = buildInstallMarker();
          await storage.setItem(storage.keys.installMarker, nextInstallMarker);
          await secureValueStore.setString(
            storage.keys.installFingerprint,
            nextInstallMarker.installationId,
          );
        }

        const authState = useAuthStore.getState();
        if (authState.isAuthenticated && authState.user && !authState.user.isEmailVerified) {
          await clearAccountScopedData();
        }

        await setLanguage(useAuthStore.getState().language);

        const tokens = await secureSession.getTokens();
        if (!tokens && useAuthStore.getState().isAuthenticated) {
          await clearAccountScopedData();
        }
      } catch (error) {
        if (__DEV__) {
          console.error('[bootstrap] failed to initialize app state', error);
        }
      } finally {
        setReady(true);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void setLanguage(language);
  }, [isReady, language]);

  return { isReady };
};
