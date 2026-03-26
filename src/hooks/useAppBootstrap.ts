import { useEffect, useState } from 'react';
import { setLanguage } from '@/i18n';
import { useAuthStore } from '@/state/authStore';
import { secureSession } from '@/services/storage';
import { clearAccountScopedData } from '@/services/accountCleanup';

export const useAppBootstrap = () => {
  const [isReady, setReady] = useState(false);
  const language = useAuthStore((s) => s.language);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const run = async () => {
      try {
        await setLanguage(language);

        const tokens = await secureSession.getTokens();
        if (!tokens && isAuthenticated) {
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
