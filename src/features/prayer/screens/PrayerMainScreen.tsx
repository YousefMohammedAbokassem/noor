import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { usePrayerStore } from '@/state/prayerStore';
import { usePrayerCountdown } from '@/hooks/usePrayerCountdown';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { RootStackParamList } from '@/navigation/types';
import { PrayerName } from '@/types/models';
import { getThemeByMode } from '@/theme';

const prayerConfig: Array<{ key: PrayerName; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'fajr', icon: 'moon-outline' },
  { key: 'sunrise', icon: 'sunny-outline' },
  { key: 'dhuhr', icon: 'sunny' },
  { key: 'asr', icon: 'partly-sunny-outline' },
  { key: 'maghrib', icon: 'cloudy-night-outline' },
  { key: 'isha', icon: 'moon' },
];

export const PrayerMainScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const runtimeHealth = usePrayerStore((s) => s.runtimeHealth);
  const countdown = usePrayerCountdown(prayerTimes);
  const prayerSettings = useSettingsStore((s) => s.prayerSettings);
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const accentColor = isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;
  const nextPrayerLabel = countdown.nextName ? t(`prayer.names.${countdown.nextName}`) : '--';

  if (!prayerTimes) {
    return (
      <Screen showDecorations={false} contentStyle={styles.content}>
        <AppCard style={styles.emptyCard}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.brand.mist }]}>
            <Ionicons name="time-outline" size={34} color={accentColor} />
          </View>
          <AppText variant="headingSm" style={styles.centerText}>
            {t('prayer.todayTimes')}
          </AppText>
          <AppText variant="bodyMd" style={styles.centerText} color={theme.colors.neutral.textSecondary}>
            {t('prayer.noCity')}
          </AppText>
          <AppText variant="bodySm" style={styles.centerText} color={theme.colors.neutral.textMuted}>
            {t('prayer.requestLocationHint')}
          </AppText>
        </AppCard>

        <View style={styles.actions}>
          <AppButton title={t('prayer.requestLocation')} onPress={() => navigation.navigate('PrayerLocationRequest')} />
          <AppButton title={t('prayer.manualCity')} variant="ghost" onPress={() => navigation.navigate('ManualCity')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen showDecorations={false} contentStyle={styles.content}>
      <AppCard style={[styles.heroCard, { backgroundColor: theme.colors.brand.darkGreen, borderColor: theme.colors.brand.green }]}>
        <View style={styles.heroTopRow}>
          <View style={styles.cityInfo}>
            <AppText variant="headingSm" color={theme.colors.neutral.textOnBrand}>
              {prayerTimes.cityName}
            </AppText>
            <AppText variant="bodySm" color="#CFE0D5">
              {t('prayer.todayTimes')}
            </AppText>
          </View>
          <View style={styles.dateBadge}>
            <AppText variant="bodySm" color="#EED79B">
              {prayerTimes.date}
            </AppText>
          </View>
        </View>

        <View style={styles.nextPrayerRow}>
          <View style={styles.nextIconWrap}>
            <Ionicons name="time-outline" size={24} color="#F0D593" />
          </View>
          <View style={styles.nextInfo}>
            <AppText variant="bodySm" color="#CFE0D5">
              {t('prayer.nextPrayer')}
            </AppText>
            <AppText variant="headingSm" color="#FFFFFF">
              {nextPrayerLabel}
            </AppText>
          </View>
          <View style={styles.remainingWrap}>
            <AppText variant="label" color="#DCE8E0">
              {t('prayer.remaining')}
            </AppText>
            <AppText variant="headingSm" color="#F2DA9D">
              {countdown.remaining ?? '--:--'}
            </AppText>
          </View>
        </View>
      </AppCard>

      <AppCard style={styles.timesCard}>
        {prayerConfig.map((item) => {
          const isNext = countdown.nextName === item.key;
          const prayerValue = prayerTimes[item.key] ?? '--:--';

          return (
            <View
              key={item.key}
              style={[
                styles.timeRow,
                {
                  borderColor: isNext ? '#CFAE5C' : theme.colors.neutral.border,
                  backgroundColor: isNext
                    ? theme.colors.brand.darkGreen
                    : isDark
                      ? theme.colors.neutral.surfaceAlt
                      : theme.colors.neutral.backgroundElevated,
                },
              ]}
            >
              <View style={styles.timeRowLeft}>
                <View style={[styles.timeIconWrap, { backgroundColor: isNext ? 'rgba(233,208,139,0.2)' : theme.colors.brand.mist }]}>
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={isNext ? '#F2DA9D' : accentColor}
                  />
                </View>
                <AppText variant="bodyLg" color={isNext ? '#FFFFFF' : undefined}>
                  {t(`prayer.names.${item.key}`)}
                </AppText>
              </View>
              <AppText variant="bodyLg" color={isNext ? '#F2DA9D' : undefined}>
                {prayerValue}
              </AppText>
            </View>
          );
        })}
      </AppCard>

      {(runtimeHealth.issues.length > 0 || runtimeHealth.scheduledUntil) && (
        <AppCard style={styles.statusCard}>
          <AppText variant="headingSm">{t('prayer.reliabilityTitle')}</AppText>
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
            {t('prayer.reliabilitySummary', {
              until: runtimeHealth.scheduledUntil ?? '--',
              count: runtimeHealth.scheduledCount,
            })}
          </AppText>
          {runtimeHealth.issues.length > 0 && (
            <AppText variant="bodySm" color={theme.colors.neutral.warning}>
              {runtimeHealth.issues.map((issue) => t(`prayer.runtimeIssues.${issue}`)).join(' • ')}
            </AppText>
          )}
        </AppCard>
      )}

      <View style={styles.actions}>
        <AppButton title={t('prayer.settings')} onPress={() => navigation.navigate('PrayerSettings')} />
        <AppButton title={t('qibla.title')} variant="ghost" onPress={() => navigation.navigate('Qibla')} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  heroCard: {
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cityInfo: {
    flex: 1,
    gap: 2,
  },
  dateBadge: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(231,206,134,0.42)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPrayerRow: {
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(231,206,134,0.34)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(231,206,134,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextInfo: {
    flex: 1,
    gap: 2,
  },
  remainingWrap: {
    minWidth: 90,
    alignItems: 'center',
    gap: 2,
  },
  timesCard: {
    gap: 8,
  },
  statusCard: {
    gap: 6,
  },
  timeRow: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    gap: 10,
  },
});
