import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { useAuthStore } from '@/state/authStore';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { notificationService } from '@/services/notificationService';
import { locationService } from '@/services/locationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const auth = useAuthStore();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        let nextRoute: 'Language' | 'MainTabs' | 'Onboarding';
        if (!auth.isOnboardingDone) {
          nextRoute = 'Language';
        } else {
          nextRoute = auth.isAuthenticated || auth.isGuest ? 'MainTabs' : 'Onboarding';
        }

        try {
          const [notificationGranted, locationGranted] = await Promise.all([
            notificationService.getPermissionStatus(),
            locationService.getPermissionStatus(),
          ]);

          if (cancelled) {
            return;
          }

          if (notificationGranted && locationGranted) {
            navigation.replace(nextRoute);
            return;
          }
        } catch {
          // Fall back to the permission gate when permission status cannot be read.
        }

        if (!cancelled) {
          navigation.replace('PermissionGate', { nextRoute });
        }
      })();
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [auth.isAuthenticated, auth.isGuest, auth.isOnboardingDone, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.brand.darkGreen }]}>
      <View style={[styles.glow, { backgroundColor: theme.colors.brand.softGold }]} />
      <Image source={require('../../../../assets/logo-mark.webp')} style={styles.logo} resizeMode="contain" />
      <AppText variant="headingMd" color={theme.colors.neutral.textOnBrand}>
        {t('appName')}
      </AppText>
      <AppText variant="bodySm" color={theme.colors.brand.softGold}>
        {t('splash.subtitle')}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  logo: {
    width: 132,
    height: 132,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    opacity: 0.1,
    top: '30%',
  },
});
