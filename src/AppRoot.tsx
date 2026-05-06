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
import { useKhatmaStore } from '@/state/khatmaStore';
import { AppAlertProvider } from '@/components/ui/AppAlertProvider';
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
const CLOCK_CHECK_INTERVAL_MS = 30_000;
const CLOCK_JUMP_TOLERANCE_MS = 90_000;
const AUTO_LOCATION_REFRESH_INTERVAL_MS = 5 * 60_000;
const NOTIFICATION_DEFERRED_ROUTES = new Set<keyof RootStackParamList>([
  'Splash',
  'PermissionGate',
  'Language',
  'Onboarding',
  'Login',
  'Register',
  'ForgotPassword',
  'ResetPassword',
  'VerifyEmail',
]);

const isAutoLocationRefreshDue = (lastUpdatedAt?: string) => {
  if (!lastUpdatedAt) {
    return true;
  }

  const lastUpdatedTime = new Date(lastUpdatedAt).getTime();
  if (!Number.isFinite(lastUpdatedTime)) {
    return true;
  }

  return Date.now() - lastUpdatedTime >= AUTO_LOCATION_REFRESH_INTERVAL_MS;
};

export const AppRoot = () => {
  const { isReady } = useAppBootstrap();
  const rating = useRatingPrompt();
  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const language = useAuthStore((s) => s.language);
  const reminders = useSettingsStore((s) => s.reminders);
  const dhikrLoopSettings = useSettingsStore((s) => s.dhikrLoopSettings);
  const prayerSettings = useSettingsStore((s) => s.prayerSettings);
  const khatmaUpdatedAt = useKhatmaStore((s) => s.syncMetadata.khatmaUpdatedAt);
  const settingsSyncStartedRef = React.useRef(false);
  const lastClockSampleRef = React.useRef<{ timestamp: number; timeZone: string } | null>(null);
  const isAppActiveRef = React.useRef(AppState.currentState === 'active');
  const pendingNotificationOpenRef = React.useRef<{
    kind?: 'reminder' | 'adhan' | 'pre_adhan' | 'dhikr_loop';
    reminderType?: string;
    target?: 'adhkar' | 'prayer' | 'reminders';
  } | null>(null);

  const navigateFromNotification = React.useCallback(
    (payload: {
      kind?: 'reminder' | 'adhan' | 'pre_adhan' | 'dhikr_loop';
      reminderType?: string;
      target?: 'adhkar' | 'prayer' | 'reminders';
    }) => {
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
    },
    [],
  );

  const flushPendingNotificationOpen = React.useCallback(() => {
    if (!navigationRef.isReady()) {
      return;
    }

    const payload = pendingNotificationOpenRef.current;
    if (!payload) {
      return;
    }

    const currentRoute = navigationRef.getCurrentRoute();
    const currentRouteName = currentRoute?.name as keyof RootStackParamList | undefined;
    if (!currentRouteName || NOTIFICATION_DEFERRED_ROUTES.has(currentRouteName)) {
      return;
    }

    pendingNotificationOpenRef.current = null;
    navigateFromNotification(payload);
  }, [navigateFromNotification]);

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

    const timer = setTimeout(() => {
      void prayerRuntime.initialize();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [isReady]);

  React.useEffect(() => {
    if (!isReady) return;
    const appStateSubscription = AppState.addEventListener('change', (status) => {
      isAppActiveRef.current = status === 'active';
      if (status === 'active') {
        const now = Date.now();
        const currentPrayerSettings = useSettingsStore.getState().prayerSettings;
        const currentTimeZone = locationService.getCurrentTimeZone();
        const previous = lastClockSampleRef.current;
        const clockMovedBack = previous ? now + 60_000 < previous.timestamp : false;
        const timeZoneChanged = previous ? previous.timeZone !== currentTimeZone : false;
        const autoLocationRefreshDue =
          currentPrayerSettings.locationMode === 'auto' &&
          isAutoLocationRefreshDue(currentPrayerSettings.locationUpdatedAt);
        lastClockSampleRef.current = {
          timestamp: now,
          timeZone: currentTimeZone,
        };

        void prayerRuntime.requestRepair(clockMovedBack || timeZoneChanged ? 'app_foreground_clock_changed' : 'app_foreground', {
          allowLocationRefresh: autoLocationRefreshDue,
          forceNotificationResync: clockMovedBack || timeZoneChanged,
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
    lastClockSampleRef.current = {
      timestamp: Date.now(),
      timeZone: locationService.getCurrentTimeZone(),
    };

    const timer = setInterval(() => {
      if (!isAppActiveRef.current) return;

      const currentPrayerTimes = usePrayerStore.getState().prayerTimes;
      const currentPrayerSettings = useSettingsStore.getState().prayerSettings;
      const now = new Date();
      const currentTimeZone = locationService.getCurrentTimeZone();
      const previous = lastClockSampleRef.current;
      lastClockSampleRef.current = {
        timestamp: now.getTime(),
        timeZone: currentTimeZone,
      };
      const elapsed = previous ? now.getTime() - previous.timestamp : CLOCK_CHECK_INTERVAL_MS;
      const clockJumpedBack = elapsed < -1_000;
      const clockJumped = clockJumpedBack || Math.abs(elapsed - CLOCK_CHECK_INTERVAL_MS) > CLOCK_JUMP_TOLERANCE_MS;
      const timeZoneChanged = previous ? previous.timeZone !== currentTimeZone : false;

      const autoLocationRefreshDue =
        currentPrayerSettings.locationMode === 'auto' &&
        isAutoLocationRefreshDue(currentPrayerSettings.locationUpdatedAt);

      if (!currentPrayerTimes) {
        if (autoLocationRefreshDue) {
          void prayerRuntime.requestRepair('auto_location_refresh_due', {
            allowLocationRefresh: true,
            forceNotificationResync: false,
          });
        }
        return;
      }

      const timeZone = currentPrayerTimes.timezone ?? currentTimeZone;
      const today = getDateKeyInTimeZone(now, timeZone);
      if (currentPrayerTimes.date !== today) {
        void prayerRuntime.requestRepair('date_rollover', {
          allowLocationRefresh: currentPrayerSettings.locationMode === 'auto',
          forceNotificationResync: true,
        });
        return;
      }

      if (clockJumped || timeZoneChanged) {
        void prayerRuntime.requestRepair('system_clock_changed', {
          allowLocationRefresh: currentPrayerSettings.locationMode === 'auto',
          forceNotificationResync: true,
        });
        return;
      }

      if (autoLocationRefreshDue) {
        void prayerRuntime.requestRepair('auto_location_refresh_due', {
          allowLocationRefresh: true,
          forceNotificationResync: false,
        });
      }
    }, CLOCK_CHECK_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [isReady]);

  React.useEffect(() => {
    if (!isReady) return;

    let unsubscribe = () => {};
    let active = true;

    void notificationService
      .subscribeToNotificationOpen(
        (payload) => {
          const currentRoute = navigationRef.isReady() ? navigationRef.getCurrentRoute() : null;
          const currentRouteName = currentRoute?.name as keyof RootStackParamList | undefined;
          if (!currentRouteName || NOTIFICATION_DEFERRED_ROUTES.has(currentRouteName)) {
            pendingNotificationOpenRef.current = payload;
            return;
          }

          navigateFromNotification(payload);
        },
        { consumeInitialResponse: true },
      )
      .then((cleanup) => {
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
  }, [isReady, navigateFromNotification]);

  React.useEffect(() => {
    if (!isReady || !khatmaUpdatedAt) return;

    const timer = setTimeout(() => {
      void notificationService.syncSupplementalNotifications({
        reminders,
        dhikrLoopSettings,
        lang: language,
      });
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [dhikrLoopSettings, isReady, khatmaUpdatedAt, language, reminders]);

  if (!isReady) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
        <LoadingState label={i18n.t('common.loadingApp')} />
      </Screen>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppAlertProvider>
        <NavigationContainer
          ref={navigationRef}
          onReady={flushPendingNotificationOpen}
          onStateChange={flushPendingNotificationOpen}
        >
          <RootNavigator />
        </NavigationContainer>
      </AppAlertProvider>
    </QueryClientProvider>
  );
};
