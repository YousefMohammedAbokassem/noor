import React from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppNavigationItem } from '@/components/ui/AppNavigationItem';
import { useAppAlert } from '@/components/ui/AppAlertProvider';
import { RootStackParamList } from '@/navigation/types';
import { secureSession } from '@/services/storage';
import { useAuthStore } from '@/state/authStore';
import { authApi } from '@/api/authApi';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { clearAccountScopedData } from '@/services/accountCleanup';

const SectionTitle: React.FC<{ label: string }> = ({ label }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  return (
    <AppText variant="label" color={theme.colors.neutral.textMuted} style={styles.sectionTitle}>
      {label}
    </AppText>
  );
};

export const MoreSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { showAlert } = useAppAlert();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const auth = useAuthStore();
  const mode = useSettingsStore((s) => s.readerTheme);
  const setReaderTheme = useSettingsStore((s) => s.setReaderTheme);
  const nextMode = mode === 'dark' ? 'light' : 'dark';

  const logout = async () => {
    const tokens = await secureSession.getTokens();
    if (tokens?.refreshToken) {
      await authApi.logout(tokens.refreshToken).catch(() => null);
    }
    await clearAccountScopedData();
    navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
  };

  const deleteAccount = async () => {
    showAlert(t('more.deleteAccount'), t('more.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await authApi.deleteAccount().catch(() => null);
          await logout();
        },
      },
    ]);
  };

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.screen}>
      {!auth.isAuthenticated && auth.isGuest ? (
        <AppCard style={styles.guestCard}>
          <AppText variant="headingSm">{t('more.guestModeTitle')}</AppText>
          <AppText variant="bodyMd" color={getThemeByMode(mode).colors.neutral.textSecondary}>
            {t('more.guestModeHint')}
          </AppText>
          <View style={styles.guestActions}>
            <AppButton title={t('auth.loginTitle')} onPress={() => navigation.navigate('Login')} style={styles.guestButton} />
            <AppButton
              title={t('auth.registerTitle')}
              variant="secondary"
              onPress={() => navigation.navigate('Register')}
              style={styles.guestButton}
            />
          </View>
        </AppCard>
      ) : null}

      <SectionTitle label={t('more.currentKhatma')} />
      <AppCard style={styles.sectionCard}>
        <AppNavigationItem
          icon="book-outline"
          label={t('more.currentKhatma')}
          hint={t('more.quranSectionHint')}
          onPress={() => navigation.navigate('MainTabs')}
        />
        <AppNavigationItem
          icon="add-outline"
          label={t('more.startKhatma')}
          hint={t('more.startKhatmaHint')}
          onPress={() => navigation.navigate('CreateKhatmaStep1')}
        />
      </AppCard>

      <SectionTitle label={t('more.title')} />
      <AppCard style={styles.sectionCard}>
        <AppNavigationItem
          icon="notifications-outline"
          label={t('more.reminders')}
          hint={t('more.remindersHint')}
          onPress={() => navigation.navigate('Reminders')}
        />
        <AppNavigationItem
          icon="language-outline"
          label={t('more.language')}
          hint={t('language.title')}
          onPress={() => navigation.navigate('Language')}
        />
        <AppNavigationItem
          icon={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
          label={t('more.themeMode')}
          hint={t('more.themeHint', { mode: t(`quran.themes.${mode}`) })}
          onPress={() => setReaderTheme(nextMode)}
        />
        <AppNavigationItem
          icon="time-outline"
          label={t('more.prayerSettings')}
          hint={t('more.prayerSettingsHint')}
          onPress={() => navigation.navigate('PrayerSettings')}
        />
        <AppNavigationItem
          icon="compass-outline"
          label={t('more.qibla')}
          hint={t('more.qiblaHint')}
          onPress={() => navigation.navigate('Qibla')}
        />
        <AppNavigationItem
          icon="sync-outline"
          label={t('more.accountSync')}
          hint={t('more.accountSyncHint')}
          onPress={() => navigation.navigate('AccountSync')}
        />
      </AppCard>

      <SectionTitle label={t('support.title')} />
      <AppCard style={styles.sectionCard}>
        <AppNavigationItem
          icon="heart-outline"
          label={t('support.action')}
          hint={t('more.supportHint')}
          onPress={() => navigation.navigate('Support')}
        />
        <AppNavigationItem
          icon="mail-outline"
          label={t('more.contactUs')}
          onPress={() => showAlert(t('more.contactUs'), 'support@noor-alhayah.app')}
        />
        <AppNavigationItem
          icon="share-social-outline"
          label={t('more.shareApp')}
          onPress={() => Share.share({ message: t('appName') })}
        />
        <AppNavigationItem icon="star-outline" label={t('more.rate')} onPress={() => navigation.navigate('RatingExperience')} />
      </AppCard>

      {auth.isAuthenticated ? (
        <>
          <SectionTitle label={t('more.accountSync')} />
          <AppCard style={styles.sectionCard}>
            <AppNavigationItem icon="trash-outline" label={t('more.deleteAccount')} onPress={deleteAccount} danger />
            <AppNavigationItem icon="log-out-outline" label={t('common.logout')} onPress={logout} danger />
          </AppCard>
        </>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingTop: 6,
    paddingBottom: 24,
    gap: 10,
  },
  guestCard: {
    gap: 12,
  },
  guestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  guestButton: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: -2,
    marginTop: 2,
  },
  sectionCard: {
    gap: 8,
  },
});
