import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppNavigationItem } from '@/components/ui/AppNavigationItem';
import { InlineBackThemeBar } from '@/components/ui/InlineBackThemeBar';
import { goBackSmart } from '@/navigation/goBackSmart';
import { usePrayerStore } from '@/state/prayerStore';
import { usePrayerCountdown } from '@/hooks/usePrayerCountdown';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { PrayerName } from '@/types/models';
import { getThemeByMode } from '@/theme';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';
import { buildManualPrayerTimesSeed } from '@/services/prayer/manualTimes';

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
  const navigation = useNavigation<any>();
  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const prayerSettings = useSettingsStore((s) => s.prayerSettings);
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';
  const accentColor = isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;
  const effectivePrayerTimes = prayerTimes;
  const countdown = usePrayerCountdown(effectivePrayerTimes);
  const nextPrayerLabel = countdown.nextName ? t(`prayer.names.${countdown.nextName}`) : '--';
  const goBack = () => {
    goBackSmart(navigation);
  };
  const openManualTiming = React.useCallback(() => {
    if (prayerSettings.timeMode === 'manual') {
      navigation.navigate('PrayerSettings');
      return;
    }

    const seededTimes = buildManualPrayerTimesSeed(prayerTimes, prayerSettings.manualPrayerTimes);
    void (async () => {
      await prayerRuntime.updatePrayerSettings(
        {
          timeMode: 'manual',
          manualPrayerTimes: seededTimes,
        },
        'home_enable_manual_times',
      );
      navigation.navigate('PrayerSettings');
    })();
  }, [navigation, prayerSettings.manualPrayerTimes, prayerSettings.timeMode, prayerTimes]);

  if (!effectivePrayerTimes) {
    return (
      <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
        <InlineBackThemeBar onBack={goBack} />

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
        </View>
      </Screen>
    );
  }

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      <InlineBackThemeBar onBack={goBack} />

      <AppCard style={[styles.heroCard, { backgroundColor: theme.colors.brand.darkGreen, borderColor: theme.colors.brand.green }]}>
        <View style={[styles.heroTopRow, isRTL && styles.rowReverse]}>
          <View style={[styles.cityInfo, isRTL && styles.textWrapRtl]}>
            <AppText variant="headingSm" color={theme.colors.neutral.textOnBrand}>
              {effectivePrayerTimes.cityName}
            </AppText>
            <AppText variant="bodySm" color="#CFE0D5">
              {t('prayer.todayTimes')}
            </AppText>
          </View>
          <View style={styles.dateBadge}>
            <AppText variant="bodySm" direction="ltr" color="#EED79B">
              {effectivePrayerTimes.date}
            </AppText>
          </View>
        </View>

        <View style={[styles.nextPrayerRow, isRTL && styles.rowReverse]}>
          <View style={styles.nextIconWrap}>
            <Ionicons name="time-outline" size={24} color="#F0D593" />
          </View>
          <View style={[styles.nextInfo, isRTL && styles.textWrapRtl]}>
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
            <AppText variant="headingSm" direction="ltr" color="#F2DA9D">
              {countdown.remaining ?? '--:--'}
            </AppText>
          </View>
        </View>
      </AppCard>

      <View style={[styles.primaryActionsRow, isRTL && styles.rowReverse]}>
        <AppButton
          title={t('prayer.settings')}
          onPress={() => navigation.navigate('PrayerSettings')}
          style={styles.primaryActionButton}
        />
        <AppButton
          title={
            prayerSettings.timeMode === 'manual'
              ? t('prayer.editManualTimesAction')
              : t('prayer.enableManualTimesAction')
          }
          onPress={openManualTiming}
          variant="ghost"
          style={styles.secondaryActionButton}
        />
      </View>

      <AppCard style={styles.timesCard}>
        {prayerConfig.map((item) => {
          const isNext = countdown.nextName === item.key;
          const prayerValue = effectivePrayerTimes[item.key] ?? '--:--';

          return (
            <View
              key={item.key}
              style={[
                styles.timeRow,
                isRTL && styles.rowReverse,
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
              <View style={[styles.timeRowLeft, isRTL && styles.rowReverse]}>
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
              <AppText variant="bodyLg" direction="ltr" color={isNext ? '#F2DA9D' : undefined}>
                {prayerValue}
              </AppText>
            </View>
          );
        })}
      </AppCard>

      <View style={styles.actions}>
        <AppNavigationItem
          icon="compass-outline"
          label={t('more.qibla')}
          hint={t('more.qiblaHint')}
          onPress={() => navigation.navigate('Qibla')}
          style={styles.qiblaShortcut}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
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
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  cityInfo: {
    flex: 1,
    gap: 2,
  },
  textWrapRtl: {
    alignItems: 'flex-end',
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
    paddingTop: 10,
    paddingBottom: 10,
  },
  statusCard: {
    gap: 6,
  },
  timeRow: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
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
  primaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryActionButton: {
    flex: 1,
  },
  secondaryActionButton: {
    flex: 1,
  },
  actions: {
    gap: 8,
  },
  qiblaShortcut: {
    marginTop: 2,
  },
});
