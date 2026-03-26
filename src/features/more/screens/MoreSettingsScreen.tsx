import React from 'react';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { RootStackParamList } from '@/navigation/types';
import { secureSession } from '@/services/storage';
import { useAuthStore } from '@/state/authStore';
import { authApi } from '@/api/authApi';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { clearAccountScopedData } from '@/services/accountCleanup';

type ItemProps = {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  onPress: () => void;
};

const SettingsItem: React.FC<ItemProps> = ({ label, hint, icon, danger = false, onPress }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const isDark = mode === 'dark';
  const iconColor = danger
    ? theme.colors.neutral.danger
    : isDark
      ? theme.colors.brand.softGold
      : theme.colors.brand.darkGreen;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        {
          borderColor: theme.colors.neutral.border,
          backgroundColor: theme.colors.neutral.backgroundElevated,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? theme.colors.neutral.surfaceAlt : theme.colors.brand.mist,
            borderColor: isDark ? theme.colors.neutral.border : 'transparent',
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.itemTextWrap}>
        <AppText variant="bodyLg" color={danger ? theme.colors.neutral.danger : undefined}>
          {label}
        </AppText>
        {!!hint && (
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
            {hint}
          </AppText>
        )}
      </View>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={danger ? theme.colors.neutral.danger : theme.colors.neutral.textMuted}
      />
    </Pressable>
  );
};

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
    Alert.alert(t('more.deleteAccount'), t('more.deleteConfirm'), [
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
    <Screen showDecorations={false} showThemeToggle contentStyle={styles.screen}>
      <SectionTitle label={t('more.currentKhatma')} />
      <AppCard style={styles.sectionCard}>
        <SettingsItem
          icon="book-outline"
          label={t('more.currentKhatma')}
          hint={t('more.quranSectionHint')}
          onPress={() => navigation.navigate('MainTabs')}
        />
        <SettingsItem
          icon="add-outline"
          label={t('more.startKhatma')}
          hint={t('more.startKhatmaHint')}
          onPress={() => navigation.navigate('CreateKhatmaStep1')}
        />
      </AppCard>

      <SectionTitle label={t('more.title')} />
      <AppCard style={styles.sectionCard}>
        <SettingsItem
          icon="notifications-outline"
          label={t('more.reminders')}
          hint={t('more.remindersHint')}
          onPress={() => navigation.navigate('Reminders')}
        />
        <SettingsItem
          icon="language-outline"
          label={t('more.language')}
          hint={t('language.title')}
          onPress={() => navigation.navigate('Language')}
        />
        <SettingsItem
          icon={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
          label={t('more.themeMode')}
          hint={t('more.themeHint', { mode: t(`quran.themes.${mode}`) })}
          onPress={() => setReaderTheme(nextMode)}
        />
        <SettingsItem
          icon="time-outline"
          label={t('more.prayerSettings')}
          hint={t('more.prayerSettingsHint')}
          onPress={() => navigation.navigate('PrayerSettings')}
        />
        <SettingsItem
          icon="compass-outline"
          label={t('more.qibla')}
          hint={t('more.qiblaHint')}
          onPress={() => navigation.navigate('Qibla')}
        />
        <SettingsItem
          icon="sync-outline"
          label={t('more.accountSync')}
          hint={t('more.accountSyncHint')}
          onPress={() => navigation.navigate('AccountSync')}
        />
      </AppCard>

      <SectionTitle label={t('support.title')} />
      <AppCard style={styles.sectionCard}>
        <SettingsItem
          icon="heart-outline"
          label={t('support.action')}
          hint={t('more.supportHint')}
          onPress={() => navigation.navigate('Support')}
        />
        <SettingsItem
          icon="mail-outline"
          label={t('more.contactUs')}
          onPress={() => Alert.alert(t('more.contactUs'), 'support@noor-alhayah.app')}
        />
        <SettingsItem
          icon="share-social-outline"
          label={t('more.shareApp')}
          onPress={() => Share.share({ message: t('appName') })}
        />
        <SettingsItem icon="star-outline" label={t('more.rate')} onPress={() => navigation.navigate('RatingExperience')} />
      </AppCard>

      <SectionTitle label={t('more.accountSync')} />
      <AppCard style={styles.sectionCard}>
        <SettingsItem icon="trash-outline" label={t('more.deleteAccount')} onPress={deleteAccount} danger />
        <SettingsItem icon="log-out-outline" label={t('common.logout')} onPress={logout} danger />
      </AppCard>
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    paddingTop: 6,
    paddingBottom: 24,
    gap: 10,
  },
  sectionTitle: {
    marginBottom: -2,
    marginTop: 2,
  },
  sectionCard: {
    gap: 8,
  },
  item: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
});
