import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { useAuthStore } from '@/state/authStore';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const auth = useAuthStore();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      <View style={styles.heroWrap}>
        <View
          style={[
            styles.heroBadge,
            {
              backgroundColor: isDark ? 'rgba(212,175,55,0.12)' : theme.colors.brand.mist,
              borderColor: isDark ? 'rgba(212,175,55,0.22)' : 'rgba(13,59,46,0.08)',
            },
          ]}
        >
          <AppText variant="label" color={theme.colors.brand.softGold}>
            NOOR AL-HAYAH
          </AppText>
        </View>

        <View
          style={[
            styles.heroImageWrap,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.88)',
              borderColor: isDark ? 'rgba(212,175,55,0.18)' : 'rgba(13,59,46,0.08)',
            },
          ]}
        >
          <Image source={require('../../../../assets/logo-mark.webp')} style={styles.heroImage} resizeMode="contain" />
        </View>

        <View style={styles.copy}>
          <AppText variant="headingLg" style={styles.centerText}>
            {t('onboarding.title')}
          </AppText>
          <AppText variant="bodyMd" style={styles.centerText} color={theme.colors.neutral.textSecondary}>
            {t('onboarding.body')}
          </AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <AppButton
          title={t('onboarding.guest')}
          variant="ghost"
          onPress={() => {
            auth.continueAsGuest();
            navigation.replace('PermissionGate', { nextRoute: 'MainTabs' });
          }}
        />
        <AppButton title={t('onboarding.createAccount')} onPress={() => navigation.navigate('Register')} />
        <AppButton title={t('onboarding.login')} variant="secondary" onPress={() => navigation.navigate('Login')} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 28,
  },
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  heroBadge: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageWrap: {
    width: 186,
    height: 186,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  heroImage: {
    width: 132,
    height: 132,
  },
  copy: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
});
