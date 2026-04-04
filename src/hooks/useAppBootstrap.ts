import { useEffect, useState } from 'react';
import { setLanguage } from '@/i18n';
import { useAuthStore } from '@/state/authStore';
import { secureSession, storage } from '@/services/storage';
import { clearAccountScopedData, clearInstallScopedData } from '@/services/accountCleanup';

export const useAppBootstrap = () => {
  const [isReady, setReady] = useState(false);
  const language = useAuthStore((s) => s.language);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const run = async () => {
      try {
        const installMarker = await storage.getItem<{ installedAt: string }>(storage.keys.installMarker);
        if (!installMarker) {
          await clearInstallScopedData();
          await storage.setItem(storage.keys.installMarker, { installedAt: new Date().toISOString() });
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
  }, [isAuthenticated, language]);

  return { isReady };
};
