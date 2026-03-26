import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { MainTabParamList, RootStackParamList } from '@/navigation/types';
import { useKhatmaStore } from '@/state/khatmaStore';
import { usePrayerStore } from '@/state/prayerStore';
import { usePrayerCountdown } from '@/hooks/usePrayerCountdown';
import { TOTAL_QURAN_PAGES, surahList } from '@/constants/quran';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { ThemeMode } from '@/types/models';
import { useThemeTransition } from '@/components/theme/ThemeTransitionProvider';

const prayerItems: Array<{ key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' }> = [
  { key: 'fajr' },
  { key: 'sunrise' },
  { key: 'dhuhr' },
  { key: 'asr' },
  { key: 'maghrib' },
  { key: 'isha' },
];

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getHomePalette = (mode: ThemeMode) => {
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';

  return {
    pageBackground: theme.colors.neutral.background,
    headerTitle: isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen,
    headerIconBg: isDark ? theme.colors.neutral.surfaceAlt : theme.colors.neutral.surface,
    headerIconBorder: theme.colors.neutral.borderStrong,
    headerIcon: isDark ? theme.colors.brand.softGold : theme.colors.brand.green,
    heroBase: isDark ? theme.colors.brand.darkGreen : theme.colors.brand.green,
    heroBorder: withAlpha(theme.colors.brand.softGold, isDark ? 0.2 : 0.14),
    heroTime: theme.colors.brand.softGold,
    heroText: theme.colors.neutral.textOnBrand,
    heroMeta: withAlpha(theme.colors.neutral.textOnBrand, 0.9),
    heroMetaPillBg: withAlpha(isDark ? theme.colors.neutral.background : '#FFFFFF', isDark ? 0.18 : 0.12),
    heroMetaPillBorder: withAlpha(theme.colors.brand.softGold, isDark ? 0.14 : 0.16),
    readingBadgeBg: withAlpha(isDark ? theme.colors.neutral.background : theme.colors.brand.darkGreen, isDark ? 0.48 : 0.34),
    readingBadgeBorder: withAlpha(theme.colors.brand.softGold, isDark ? 0.24 : 0.3),
    readingBadgeLabel: withAlpha(theme.colors.neutral.textOnBrand, 0.76),
    readingBadgeMeta: withAlpha(theme.colors.brand.softGold, 0.92),
    prayerChipBg: isDark ? theme.colors.neutral.surfaceAlt : theme.colors.brand.darkGreen,
    prayerChipActiveBg: isDark ? theme.colors.brand.green : theme.colors.brand.lightGreen,
    prayerChipBorder: withAlpha(isDark ? theme.colors.brand.softGold : theme.colors.brand.green, isDark ? 0.16 : 0.18),
    prayerChipTime: theme.colors.neutral.textOnBrand,
    prayerChipLabel: theme.colors.brand.softGold,
    prayerChipActiveBorder: withAlpha(theme.colors.brand.softGold, isDark ? 0.42 : 0.38),
    prayerChipActiveGlow: withAlpha(theme.colors.brand.softGold, isDark ? 0.2 : 0.16),
    prayerChipAccent: theme.colors.brand.softGold,
    prayerChipNextBadgeBg: withAlpha(theme.colors.brand.softGold, isDark ? 0.16 : 0.2),
    prayerChipNextBadgeBorder: withAlpha(theme.colors.brand.softGold, isDark ? 0.24 : 0.3),
    sectionTitle: theme.colors.neutral.textPrimary,
    sectionAction: isDark ? theme.colors.brand.softGold : theme.colors.brand.green,
    sectionActionBg: withAlpha(isDark ? theme.colors.brand.softGold : theme.colors.brand.green, isDark ? 0.08 : 0.07),
    sectionActionBorder: withAlpha(isDark ? theme.colors.brand.softGold : theme.colors.brand.green, isDark ? 0.14 : 0.16),
    khatmaCardBg: isDark ? theme.colors.neutral.surface : theme.colors.brand.darkGreen,
    khatmaCardBorder: withAlpha(isDark ? theme.colors.brand.softGold : theme.colors.brand.green, isDark ? 0.14 : 0.18),
    cardTitle: theme.colors.neutral.textOnBrand,
    cardSubtitle: withAlpha(theme.colors.neutral.textOnBrand, 0.84),
    iconBubble: withAlpha(theme.colors.brand.softGold, isDark ? 0.12 : 0.14),
    iconPrimary: theme.colors.brand.softGold,
    progressTrack: withAlpha(theme.colors.neutral.textOnBrand, 0.08),
    progressBorder: withAlpha(theme.colors.brand.softGold, 0.12),
    progressFill: theme.colors.brand.softGold,
    progressGlow: withAlpha(theme.colors.brand.softGold, isDark ? 0.22 : 0.2),
    metricBg: withAlpha(theme.colors.neutral.textOnBrand, 0.06),
    metricBorder: withAlpha(theme.colors.brand.softGold, 0.12),
    metricLabel: withAlpha(theme.colors.neutral.textOnBrand, 0.72),
    metricValue: theme.colors.neutral.textOnBrand,
    metricValueBg: withAlpha(theme.colors.brand.softGold, isDark ? 0.08 : 0.09),
    metricValueBorder: withAlpha(theme.colors.brand.softGold, isDark ? 0.12 : 0.14),
    actionPrimaryBg: theme.colors.brand.softGold,
    actionPrimaryText: theme.colors.brand.darkGreen,
    actionGhostBg: withAlpha(theme.colors.neutral.textOnBrand, 0.08),
    actionGhostText: theme.colors.neutral.textOnBrand,
    actionGhostBorder: withAlpha(theme.colors.neutral.textOnBrand, 0.14),
    gridCardBg: isDark ? theme.colors.neutral.surfaceAlt : theme.colors.brand.green,
    gridCardBorder: withAlpha(isDark ? theme.colors.brand.softGold : theme.colors.brand.green, isDark ? 0.12 : 0.16),
    gridValue: theme.colors.brand.softGold,
    quickMetaBg: withAlpha(theme.colors.neutral.textOnBrand, 0.07),
    quickMetaBorder: withAlpha(theme.colors.brand.softGold, 0.14),
  };
};

export const HomeWirdScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<HomeNavigationProp>();
  const khatma = useKhatmaStore((s) => s.activeKhatma);
  const reading = useKhatmaStore((s) => s.readingProgress);
  const pinnedMarker = useKhatmaStore((s) => s.pinnedMarker);
  const completeDailyWird = useKhatmaStore((s) => s.completeDailyWird);
  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const countdown = usePrayerCountdown(prayerTimes);
  const language = useAuthStore((s) => s.language);
  const mode = useSettingsStore((s) => s.readerTheme);
  const { toggleTheme } = useThemeTransition();
  const theme = getThemeByMode(mode);
  const palette = useMemo(() => getHomePalette(mode), [mode]);
  const isRTL = language === 'ar';
  const [now, setNow] = useState(() => new Date());

  const continuePage = pinnedMarker?.page ?? reading.currentPage;
  const currentSurah =
    surahList.find((surah) => surah.startPage <= continuePage && surah.endPage >= continuePage) ??
    surahList[0];

  const primarySurahName = language === 'ar' ? currentSurah.nameAr : currentSurah.nameEn;
  const nextPrayerLabel = countdown.nextName ? t(`prayer.names.${countdown.nextName}`) : t('common.notAvailable');
  const nextPrayerTime = countdown.nextTime ?? '--:--';
  const nextPrayerSummary = prayerTimes
    ? `${t('prayer.nextPrayer')}: ${nextPrayerLabel} • ${nextPrayerTime}`
    : t('home.noPrayerTimesHint');
  const locale = language === 'ar' ? 'ar-SA' : 'en-US';
  const pagesRemaining = khatma ? Math.max(0, khatma.endPage - khatma.currentPage) : Math.max(0, TOTAL_QURAN_PAGES - continuePage);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const dayLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now),
    [locale, now],
  );
  const timeLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(now),
    [locale, now],
  );
  const gregorianLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(now),
    [locale, now],
  );
  const hijriLabel = useMemo(() => {
    try {
      const hijriLocale = language === 'ar' ? 'ar-SA-u-ca-islamic' : 'en-US-u-ca-islamic';
      return new Intl.DateTimeFormat(hijriLocale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
    } catch {
      return '';
    }
  }, [language, now]);

  const openCurrentReading = () =>
    navigation.navigate('QuranReader', {
      page: continuePage,
      surah: currentSurah.id,
      juz: currentSurah.juz,
    });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.pageBackground }]}>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={palette.pageBackground}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            padding: theme.spacing.md,
            gap: theme.spacing.md,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIcons}>
            <Pressable
              onPress={(event) => {
                void toggleTheme({
                  x: event.nativeEvent.pageX,
                  y: event.nativeEvent.pageY,
                });
              }}
              style={({ pressed }) => [
                styles.headerIcon,
                {
                  backgroundColor: palette.headerIconBg,
                  borderColor: palette.headerIconBorder,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
              >
                <Ionicons
                  name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                  size={20}
                  color={palette.headerIcon}
                />
              </Pressable>
          </View>

          <View style={styles.headerCenter}>
            <AppText variant="headingMd" color={palette.headerTitle} style={styles.headerTitle}>
              {t('home.dashboard')}
            </AppText>
          </View>

          <Pressable
            onPress={() => navigation.navigate('MoreSettings')}
            style={({ pressed }) => [
              styles.headerIcon,
              {
                backgroundColor: palette.headerIconBg,
                borderColor: palette.headerIconBorder,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Ionicons name="menu-outline" size={25} color={palette.headerIcon} />
          </Pressable>
        </View>

        <Pressable onPress={openCurrentReading}>
          {({ pressed }) => (
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: palette.heroBase,
                  borderColor: palette.heroBorder,
                  opacity: pressed ? 0.95 : 1,
                },
              ]}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroMain}>
                  <AppText variant="headingMd" color={palette.heroText} style={styles.heroCentered}>
                    {dayLabel}
                  </AppText>
                  <AppText variant="headingLg" color={palette.heroTime} style={[styles.heroCentered, styles.heroClock]}>
                    {timeLabel}
                  </AppText>
                </View>

                <View style={[styles.heroBottom, isRTL && styles.rowReverse]}>
                  <View style={[styles.heroDates, isRTL && styles.heroDatesRtl]}>
                    <View
                      style={[
                        styles.heroMetaPill,
                        {
                          backgroundColor: palette.heroMetaPillBg,
                          borderColor: palette.heroMetaPillBorder,
                        },
                      ]}
                    >
                      <AppText variant="bodySm" color={palette.heroMeta}>
                        {gregorianLabel}
                      </AppText>
                    </View>
                    {!!hijriLabel && (
                      <View
                        style={[
                          styles.heroMetaPill,
                          {
                            backgroundColor: palette.heroMetaPillBg,
                            borderColor: palette.heroMetaPillBorder,
                          },
                        ]}
                      >
                        <AppText variant="bodySm" color={palette.heroMeta}>
                          {hijriLabel}
                        </AppText>
                      </View>
                    )}
                  </View>

                  <View
                    style={[
                      styles.readingBadge,
                      {
                        backgroundColor: palette.readingBadgeBg,
                        borderColor: palette.readingBadgeBorder,
                      },
                    ]}
                  >
                    <View style={[styles.readingBadgeLabelRow, isRTL && styles.rowReverse]}>
                      <Ionicons name="bookmark-outline" size={14} color={palette.readingBadgeMeta} />
                      <AppText variant="bodySm" color={palette.readingBadgeLabel}>
                        {t('home.lastReadLabel')}
                      </AppText>
                    </View>
                    <AppText variant="headingSm" color={palette.heroText} style={styles.readingBadgeTitle}>
                      {primarySurahName}
                    </AppText>
                    <AppText variant="bodySm" color={palette.readingBadgeMeta}>
                      {t('quran.page')} {continuePage}
                    </AppText>
                  </View>
                </View>
              </View>
            </View>
          )}
        </Pressable>

        <View style={styles.prayerRow}>
          {prayerItems.map((item) => {
            const isNext = countdown.nextName === item.key;
            return (
              <View
                key={item.key}
                style={[
                  styles.prayerChip,
                  isNext && styles.prayerChipActive,
                  {
                    backgroundColor: isNext ? palette.prayerChipActiveBg : palette.prayerChipBg,
                    borderColor: isNext ? palette.prayerChipActiveBorder : palette.prayerChipBorder,
                  },
                ]}
              >
                {isNext && <View style={[styles.prayerChipGlow, { backgroundColor: palette.prayerChipActiveGlow }]} />}
                <View
                  style={[
                    styles.prayerChipAccent,
                    {
                      backgroundColor: isNext ? palette.prayerChipAccent : palette.prayerChipBorder,
                    },
                  ]}
                />
                {isNext ? (
                  <>
                    <View
                      style={[
                        styles.nextPrayerBadge,
                        {
                          backgroundColor: palette.prayerChipNextBadgeBg,
                          borderColor: palette.prayerChipNextBadgeBorder,
                        },
                      ]}
                    >
                      <AppText variant="bodySm" color={palette.prayerChipLabel} style={styles.prayerTextCenter}>
                        {t('prayer.nextPrayer')}
                      </AppText>
                    </View>
                    <AppText
                      variant="headingSm"
                      color={palette.prayerChipTime}
                      style={[styles.prayerTextCenter, styles.prayerTimeActive]}
                    >
                      {prayerTimes?.[item.key] ?? '--:--'}
                    </AppText>
                    <AppText variant="bodySm" color={palette.prayerChipLabel} style={styles.prayerTextCenter}>
                      {t(`prayer.names.${item.key}`)}
                    </AppText>
                    <AppText variant="label" color={palette.prayerChipTime} style={styles.prayerTextCenter}>
                      {`${t('prayer.remaining')}: ${countdown.remaining ?? '--:--:--'}`}
                    </AppText>
                  </>
                ) : (
                  <>
                    <AppText variant="label" color={palette.prayerChipTime} style={styles.prayerTextCenter}>
                      {prayerTimes?.[item.key] ?? '--:--'}
                    </AppText>
                    <AppText variant="bodySm" color={palette.prayerChipLabel} style={styles.prayerTextCenter}>
                      {t(`prayer.names.${item.key}`)}
                    </AppText>
                  </>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.sectionHeader}>
          <Pressable
            onPress={() => navigation.navigate('PrayerSettings')}
            style={({ pressed }) => [
              styles.sectionAction,
              isRTL && styles.rowReverse,
              {
                backgroundColor: palette.sectionActionBg,
                borderColor: palette.sectionActionBorder,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <Ionicons name="refresh-outline" size={16} color={palette.sectionAction} />
            <AppText variant="bodySm" color={palette.sectionAction}>
              {t('home.updatePrayerTimes')}
            </AppText>
          </Pressable>

          <AppText variant="headingMd" color={palette.sectionTitle}>
            {t('home.mainSections')}
          </AppText>
        </View>

        <View
          style={[
            styles.khatmaCard,
            {
              backgroundColor: palette.khatmaCardBg,
              borderColor: palette.khatmaCardBorder,
            },
          ]}
        >
          <View style={[styles.khatmaHeader, isRTL && styles.rowReverse]}>
            <View style={[styles.sectionIconBubble, { backgroundColor: palette.iconBubble }]}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={32} color={palette.iconPrimary} />
            </View>

            <View style={styles.khatmaHeaderText}>
              <AppText variant="headingMd" color={palette.cardTitle}>
                {t('home.khatmaShowcase')}
              </AppText>
              <AppText variant="bodySm" color={palette.cardSubtitle}>
                {t('home.khatmaHeroHint')}
              </AppText>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: palette.iconBubble, borderColor: palette.khatmaCardBorder }]}>
              <AppText variant="bodySm" color={palette.gridValue}>
                {khatma ? t(`home.status.${khatma.trackStatus}`) : t('home.newKhatma')}
              </AppText>
            </View>
          </View>

          {khatma ? (
            <>
              <View style={[styles.progressMetaRow, isRTL && styles.rowReverse]}>
                <AppText variant="bodySm" color={palette.metricLabel}>
                  {t('home.progress')}
                </AppText>
                <AppText variant="headingSm" color={palette.progressFill} style={styles.progressMetaValue}>
                  {`${khatma.completionPercent}%`}
                </AppText>
              </View>

              <View style={[styles.progressTrack, { backgroundColor: palette.progressTrack, borderColor: palette.progressBorder }]}>
                <View style={[styles.progressGlowFill, { backgroundColor: palette.progressGlow }]} />
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(0, Math.min(100, khatma.completionPercent))}%`,
                      backgroundColor: palette.progressFill,
                    },
                  ]}
                />
              </View>

              <View style={[styles.metricsRow, isRTL && styles.rowReverse]}>
                <View style={[styles.metricCard, { backgroundColor: palette.metricBg, borderColor: palette.metricBorder }]}>
                  <AppText variant="bodySm" color={palette.metricLabel}>
                    {t('home.currentPage')}
                  </AppText>
                  <View style={[styles.metricValueWrap, { backgroundColor: palette.metricValueBg, borderColor: palette.metricValueBorder }]}>
                    <AppText variant="headingSm" color={palette.metricValue} style={styles.metricValueText}>
                      {khatma.currentPage}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.metricCard, { backgroundColor: palette.metricBg, borderColor: palette.metricBorder }]}>
                  <AppText variant="bodySm" color={palette.metricLabel}>
                    {t('home.todayGoal')}
                  </AppText>
                  <View style={[styles.metricValueWrap, { backgroundColor: palette.metricValueBg, borderColor: palette.metricValueBorder }]}>
                    <AppText variant="headingSm" color={palette.metricValue} style={styles.metricValueText}>
                      {khatma.dailyPages}
                    </AppText>
                  </View>
                </View>

                <View style={[styles.metricCard, { backgroundColor: palette.metricBg, borderColor: palette.metricBorder }]}>
                  <AppText variant="bodySm" color={palette.metricLabel}>
                    {t('home.pagesRemaining')}
                  </AppText>
                  <View style={[styles.metricValueWrap, { backgroundColor: palette.metricValueBg, borderColor: palette.metricValueBorder }]}>
                    <AppText variant="headingSm" color={palette.metricValue} style={styles.metricValueText}>
                      {pagesRemaining}
                    </AppText>
                  </View>
                </View>
              </View>

              <View style={[styles.actionsRow, isRTL && styles.rowReverse]}>
                <Pressable
                  onPress={completeDailyWird}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonPrimary,
                    {
                      backgroundColor: palette.actionPrimaryBg,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <AppText variant="label" color={palette.actionPrimaryText} style={styles.actionLabel}>
                    {t('home.completeWird')}
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={openCurrentReading}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonGhost,
                    {
                      backgroundColor: palette.actionGhostBg,
                      borderColor: palette.actionGhostBorder,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <AppText variant="label" color={palette.actionGhostText} style={styles.actionLabel}>
                    {t('home.continueReading')}
                  </AppText>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <AppText variant="bodyMd" color={palette.cardSubtitle}>
                {t('home.noKhatmaHint')}
              </AppText>

              <View style={[styles.actionsRow, isRTL && styles.rowReverse]}>
                <Pressable
                  onPress={() => navigation.navigate('CreateKhatmaStep1')}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonPrimary,
                    {
                      backgroundColor: palette.actionPrimaryBg,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <AppText variant="label" color={palette.actionPrimaryText} style={styles.actionLabel}>
                    {t('home.newKhatma')}
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={openCurrentReading}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonGhost,
                    {
                      backgroundColor: palette.actionGhostBg,
                      borderColor: palette.actionGhostBorder,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <AppText variant="label" color={palette.actionGhostText} style={styles.actionLabel}>
                    {t('home.continueReading')}
                  </AppText>
                </Pressable>
              </View>
            </>
          )}
        </View>

        <View style={styles.quickGrid}>
          <Pressable style={[styles.quickCardWrap, styles.quickCardWrapFull]} onPress={() => navigation.navigate('PrayerSettings')}>
            {({ pressed }) => (
              <View
                style={[
                  styles.quickCard,
                  {
                    backgroundColor: palette.gridCardBg,
                    borderColor: palette.gridCardBorder,
                    opacity: pressed ? 0.92 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.sectionIconBubble,
                    styles.quickCardIcon,
                    isRTL ? styles.quickCardIconRtl : styles.quickCardIconLtr,
                    { backgroundColor: palette.iconBubble },
                  ]}
                >
                  <Ionicons name="time-outline" size={24} color={palette.iconPrimary} />
                </View>
                <AppText variant="headingSm" color={palette.cardTitle}>
                  {t('prayer.todayTimes')}
                </AppText>
                <AppText variant="bodySm" color={palette.cardSubtitle} numberOfLines={2}>
                  {nextPrayerSummary}
                </AppText>
                <View style={[styles.quickMetaBadge, { backgroundColor: palette.quickMetaBg, borderColor: palette.quickMetaBorder }]}>
                  <AppText variant="label" color={palette.gridValue}>
                    {prayerTimes ? `${t('prayer.remaining')}: ${countdown.remaining ?? '--:--:--'}` : t('home.updatePrayerTimes')}
                  </AppText>
                </View>
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 196,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    textAlign: 'center',
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    minHeight: 226,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroMain: {
    alignItems: 'center',
    gap: 4,
  },
  heroCentered: {
    textAlign: 'center',
  },
  heroClock: {
    fontSize: 46,
    lineHeight: 54,
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 14,
  },
  heroDates: {
    flexShrink: 1,
    gap: 8,
  },
  heroDatesRtl: {
    alignItems: 'flex-end',
  },
  heroMetaPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readingBadge: {
    minWidth: 150,
    maxWidth: '54%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 5,
  },
  readingBadgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readingBadgeTitle: {
    lineHeight: 24,
  },
  prayerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  prayerChip: {
    width: '31.2%',
    minHeight: 78,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    overflow: 'hidden',
  },
  prayerChipActive: {
    transform: [{ translateY: -1 }],
  },
  prayerChipGlow: {
    position: 'absolute',
    top: -10,
    width: '84%',
    height: 56,
    borderRadius: 999,
  },
  prayerChipAccent: {
    position: 'absolute',
    top: 0,
    width: '54%',
    height: 3,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  prayerTextCenter: {
    textAlign: 'center',
  },
  nextPrayerBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prayerTimeActive: {
    fontSize: 15,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  khatmaCard: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  khatmaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  khatmaHeaderText: {
    flex: 1,
    gap: 3,
  },
  sectionIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCardIcon: {
    marginBottom: 2,
  },
  quickCardIconLtr: {
    alignSelf: 'flex-start',
  },
  quickCardIconRtl: {
    alignSelf: 'flex-end',
  },
  statusBadge: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressMetaValue: {
    lineHeight: 24,
  },
  progressTrack: {
    width: '100%',
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressGlowFill: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 9,
    borderRadius: 999,
    opacity: 0.32,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  metricValueWrap: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  metricValueText: {
    fontSize: 22,
    lineHeight: 28,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionButtonPrimary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  actionButtonGhost: {
    borderWidth: 1,
  },
  actionLabel: {
    textAlign: 'center',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  quickCardWrap: {
    width: '48.7%',
  },
  quickCardWrapFull: {
    width: '100%',
  },
  quickCard: {
    minHeight: 182,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  quickMetaBadge: {
    marginTop: 'auto',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
