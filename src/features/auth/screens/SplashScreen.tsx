import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { useAuthStore } from '@/state/authStore';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const auth = useAuthStore();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  useEffect(() => {
    const timer = setTimeout(() => {
      let nextRoute: 'Language' | 'MainTabs' | 'Onboarding';
      if (!auth.isOnboardingDone) {
        nextRoute = 'Language';
      } else if (auth.isAuthenticated || auth.isGuest) {
        nextRoute = 'MainTabs';
      } else {
        nextRoute = 'Onboarding';
      }

      navigation.replace(nextRoute);
    }, 1200);

    return () => clearTimeout(timer);
  }, [auth.isAuthenticated, auth.isGuest, auth.isOnboardingDone, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.brand.darkGreen }]}>
      <View style={[styles.glow, { backgroundColor: theme.colors.brand.softGold }]} />
      <Image source={require('../../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
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
    width: 84,
    height: 84,
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
