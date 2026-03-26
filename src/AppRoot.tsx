import React from 'react';
import './i18n';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useAppBootstrap } from '@/hooks/useAppBootstrap';
import { LoadingState } from '@/components/states/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { useRatingPrompt } from '@/hooks/useRatingPrompt';
import { RootStackParamList } from '@/navigation/types';
import i18n from '@/i18n';
import { usePrayerStore } from '@/state/prayerStore';
import { useAuthStore } from '@/state/authStore';
import { useSettingsStore } from '@/state/settingsStore';
import { notificationService } from '@/services/notificationService';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';
import { getDateKeyInTimeZone } from '@/services/prayer/dateTime';
import { locationService } from '@/services/locationService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
});

const navigationRef = createNavigationContainerRef<RootStackParamList>();

export const AppRoot = () => {
  const { isReady } = useAppBootstrap();
  const rating = useRatingPrompt();
  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const language = useAuthStore((s) => s.language);
  const reminders = useSettingsStore((s) => s.reminders);
  const dhikrLoopSettings = useSettingsStore((s) => s.dhikrLoopSettings);
  const prayerSettings = useSettingsStore((s) => s.prayerSettings);
  const settingsSyncStartedRef = React.useRef(false);

  React.useEffect(() => {
    if (rating.visible && navigationRef.isReady()) {
      const current = navigationRef.getCurrentRoute();
      if (current?.name !== 'RatingExperience') {
        navigationRef.navigate('RatingExperience');
      }
    }
  }, [rating.visible]);

  React.useEffect(() => {
    if (!isReady) return;
    void prayerRuntime.initialize();
  }, [isReady]);

  React.useEffect(() => {
    if (!isReady) return;
    const appStateSubscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void prayerRuntime.requestRepair('app_foreground', {
          allowLocationRefresh: true,
        });
      }
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [isReady]);

  React.useEffect(() => {
    if (!isReady) return;
    if (!settingsSyncStartedRef.current) {
      settingsSyncStartedRef.current = true;
      return;
    }

    const timer = setTimeout(() => {
      void prayerRuntime.requestRepair('settings_watch', {
        allowLocationRefresh: prayerSettings.locationMode !== 'manual',
        forceNotificationResync: true,
      });
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [isReady, language, prayerSettings]);

  React.useEffect(() => {
    if (!isReady) return;
    const timer = setInterval(() => {
      const currentPrayerTimes = usePrayerStore.getState().prayerTimes;
      if (!currentPrayerTimes) return;

      const timeZone = currentPrayerTimes.timezone ?? locationService.getCurrentTimeZone();
      const today = getDateKeyInTimeZone(new Date(), timeZone);
      if (currentPrayerTimes.date !== today) {
        void prayerRuntime.requestRepair('date_rollover', {
          allowLocationRefresh: false,
        });
      }
    }, 60_000);

    return () => {
      clearInterval(timer);
    };
  }, [isReady]);

  React.useEffect(() => {
    if (!isReady) return;

    let unsubscribe = () => {};
    let active = true;

    void notificationService.subscribeToNotificationOpen((payload) => {
      if (!navigationRef.isReady()) return;

      if (payload.kind === 'adhan' || payload.target === 'prayer') {
        navigationRef.navigate('MainTabs', { screen: 'Home' });
        return;
      }

      if (payload.kind === 'pre_adhan') {
        navigationRef.navigate('MainTabs', { screen: 'Home' });
        return;
      }

      if (payload.kind === 'dhikr_loop' || payload.target === 'adhkar') {
        navigationRef.navigate('MainTabs', { screen: 'AdhkarCategories' });
        return;
      }

      navigationRef.navigate('Reminders');
    }).then((cleanup) => {
      if (!active) {
        cleanup();
        return;
      }
      unsubscribe = cleanup;
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [isReady]);

  if (!isReady) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
        <LoadingState label={i18n.t('common.loadingApp')} />
      </Screen>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
};
