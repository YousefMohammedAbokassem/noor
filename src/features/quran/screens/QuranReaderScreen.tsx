import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useAppAlert } from '@/components/ui/AppAlertProvider';
import { juzList, surahList, TOTAL_QURAN_PAGES } from '@/constants/quran';
import { useKhatmaStore } from '@/state/khatmaStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getLocalQuranPage } from '@/data/quran';
import { getThemeByMode } from '@/theme';
import { toArabicDigits, toEnglishDigits } from '@/utils/number';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeTransition } from '@/components/theme/ThemeTransitionProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'QuranReader'>;

type ReaderVerse = {
  id: number;
  verseKey: string;
  number: number;
  surahId: number;
  surahNameAr: string;
  surahNameEn: string;
  text: string;
};

const allMushafPages = Array.from({ length: TOTAL_QURAN_PAGES }, (_, i) => i + 1);

const buildPageRange = (startPage: number, endPage: number) => {
  const start = Math.max(1, Math.min(startPage, endPage));
  const end = Math.max(start, Math.max(startPage, endPage));
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export const QuranReaderScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { showToast } = useAppAlert();
  const insets = useSafeAreaInsets();
  const language = useAuthStore((s) => s.language);
  const numberFormat = useAuthStore((s) => s.numberFormat);
  const reading = useKhatmaStore((s) => s.readingProgress);
  const updateReading = useKhatmaStore((s) => s.updateReadingProgress);
  const pinnedMarker = useKhatmaStore((s) => s.pinnedMarker);
  const togglePinnedMarker = useKhatmaStore((s) => s.togglePinnedMarker);
  const readerTheme = useSettingsStore((s) => s.readerTheme);
  const { transitionToTheme } = useThemeTransition();

  const theme = getThemeByMode(readerTheme);
  const isDark = readerTheme === 'dark';
  const isRTL = language === 'ar';
  const accentColor = isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;

  const routeSurah = route.params?.surah;
  const routeJuz = route.params?.juz;
  const routePage = route.params?.page;

  const selectedSurah = useMemo(
    () => (routeSurah ? surahList.find((item) => item.id === routeSurah) : undefined),
    [routeSurah],
  );

  const selectedJuz = useMemo(
    () => (routeJuz ? juzList.find((item) => item.id === routeJuz) : undefined),
    [routeJuz],
  );

  const readerPages = useMemo(() => {
    if (selectedSurah) {
      return buildPageRange(selectedSurah.startPage, selectedSurah.endPage);
    }

    if (selectedJuz) {
      return buildPageRange(selectedJuz.startPage, selectedJuz.endPage);
    }

    return allMushafPages;
  }, [selectedJuz, selectedSurah]);

  const resolveSurahForPage = useCallback(
    (pageNumber: number) => {
      if (selectedSurah) {
        return selectedSurah;
      }

      return (
        surahList.find((item) => pageNumber >= item.startPage && pageNumber <= item.endPage) ??
        surahList[0]
      );
    },
    [selectedSurah],
  );

  const resolvePageInRange = useCallback(
    (candidate?: number) => {
      const fallback = readerPages[0] ?? 1;
      if (!candidate) return fallback;
      return readerPages.includes(candidate) ? candidate : fallback;
    },
    [readerPages],
  );

  const initialPage = useMemo(
    () => resolvePageInRange(routePage ?? reading.currentPage),
    [reading.currentPage, resolvePageInRange, routePage],
  );

  const [currentPage, setCurrentPage] = useState(initialPage);
  const currentPageRef = useRef(initialPage);
  const listRef = useRef<FlatList<number>>(null);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 55 });

  const applyPageAsCurrent = useCallback(
    (pageNumber: number) => {
      if (pageNumber === currentPageRef.current) return;

      currentPageRef.current = pageNumber;
      setCurrentPage(pageNumber);

      const pageData = getLocalQuranPage(pageNumber);
      const pageSurah = resolveSurahForPage(pageNumber);
      const pageJuz = pageData?.juzNumber ?? pageSurah.juz;
      updateReading(pageNumber, pageSurah.id, pageJuz);
    },
    [resolveSurahForPage, updateReading],
  );

  const onViewableItemsChangedRef = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: number; isViewable?: boolean }> }) => {
      const firstVisible = viewableItems.find((entry) => entry.isViewable && typeof entry.item === 'number');
      if (!firstVisible) return;
      applyPageAsCurrent(firstVisible.item);
    },
  );

  const currentSurah = useMemo(() => resolveSurahForPage(currentPage), [currentPage, resolveSurahForPage]);
  const currentPageData = getLocalQuranPage(currentPage);
  const currentJuz = currentPageData?.juzNumber ?? currentSurah.juz;

  const pinnedPageInRange = useMemo(() => {
    if (!pinnedMarker) return undefined;
    if (!readerPages.includes(pinnedMarker.page)) return undefined;

    if (selectedSurah && pinnedMarker.surah !== selectedSurah.id) {
      return undefined;
    }

    return pinnedMarker.page;
  }, [pinnedMarker, readerPages, selectedSurah]);

  const showNoPinnedPageFeedback = useCallback(() => {
    const message = t('quran.noPinnedPageMessage');
    showToast(message, { title: t('quran.noPinnedPageTitle') });
  }, [showToast, t]);

  const goToPinnedPage = () => {
    if (!pinnedPageInRange) {
      showNoPinnedPageFeedback();
      return;
    }

    const index = readerPages.indexOf(pinnedPageInRange);
    if (index < 0) {
      showNoPinnedPageFeedback();
      return;
    }

    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0 });
    applyPageAsCurrent(pinnedPageInRange);
  };

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('MainTabs');
  };

  const toggleTheme = (originX?: number, originY?: number) => {
    void transitionToTheme(
      isDark ? 'light' : 'dark',
      originX !== undefined && originY !== undefined
        ? { x: originX, y: originY }
        : undefined,
    );
  };

  const headerTitle = selectedSurah
    ? language === 'ar'
      ? selectedSurah.nameAr
      : selectedSurah.nameEn
    : t('quran.reader');

  const toolbarMeta = `${t('quran.page')} ${currentPage} • ${t('quran.juz')} ${currentJuz}`;
  const localizeNumber = (value: number) => {
    const raw = String(value);
    if (numberFormat === 'arabic') return toArabicDigits(raw);
    if (numberFormat === 'english') return toEnglishDigits(raw);
    return language === 'ar' ? toArabicDigits(raw) : toEnglishDigits(raw);
  };
  const localizeVerseNumber = (value: number) => localizeNumber(value);
  const surahById = useMemo(() => new Map(surahList.map((item) => [item.id, item])), []);

  const renderSurahIntroCard = (surah: (typeof surahList)[number]) => {
    const revelationLabel =
      surah.revelationPlace === 'madinah' ? t('quran.revelationMadinah') : t('quran.revelationMakkah');

    return (
      <View
        style={[
          styles.surahIntroCard,
          {
            borderColor: theme.colors.neutral.borderStrong,
            backgroundColor: isDark ? theme.colors.neutral.surfaceAlt : theme.colors.neutral.backgroundElevated,
          },
        ]}
      >
        <View style={[styles.surahIntroHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.surahIntroBadge, { backgroundColor: theme.colors.brand.mist }]}>
            <AppText variant="label" color={accentColor}>
              {localizeNumber(surah.id)}
            </AppText>
          </View>

          <View style={styles.surahIntroHeaderText}>
            <AppText variant="headingSm" style={[styles.surahIntroTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {language === 'ar' ? `سورة ${surah.nameAr}` : surah.nameEn}
            </AppText>
            <AppText
              variant="bodySm"
              color={theme.colors.neutral.textSecondary}
              style={[styles.surahIntroLatin, { textAlign: isRTL ? 'right' : 'left' }]}
            >
              {`${revelationLabel} • ${t('quran.versesCount', { count: surah.versesCount })} • ${t('quran.juz')} ${localizeNumber(surah.juz)}`}
            </AppText>
          </View>
        </View>

        {surah.bismillahPre ? (
          <AppText variant="headingMd" style={[styles.basmalaText, { color: accentColor }]}>
            {t('quran.basmalaFallback')}
          </AppText>
        ) : null}
      </View>
    );
  };

  return (
    <Screen
      scroll={false}
      showDecorations={false}
      showThemeToggle={false}
      contentStyle={{
        paddingHorizontal: 0,
        paddingVertical: 0,
        gap: 0,
      }}
    >
      <View
        style={[
          styles.headerWrap,
          {
            borderBottomColor: theme.colors.neutral.border,
            backgroundColor: theme.colors.neutral.background,
          },
        ]}
      >
        <View
          style={[
            styles.headerRow,
            { flexDirection: isRTL ? 'row' : 'row-reverse' },
          ]}
        >
          <View style={styles.headerSide}>
            <Pressable
              onPress={(event) => toggleTheme(event.nativeEvent.pageX, event.nativeEvent.pageY)}
              style={[
                styles.iconButton,
                {
                  borderColor: theme.colors.neutral.border,
                  borderWidth: 1,
                  backgroundColor: theme.colors.neutral.surface,
                },
              ]}
            >
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={18}
                color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}
              />
            </Pressable>
          </View>

          <View style={styles.headerCenter} pointerEvents="none">
            <AppText variant="headingSm" numberOfLines={1} style={styles.headerTitle}>
              {headerTitle}
            </AppText>
          </View>

          <View style={styles.headerSide}>
            <Pressable onPress={goBack} style={styles.iconButton}>
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={accentColor}
              />
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.toolbarRow,
            {
              borderTopColor: theme.colors.neutral.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Pressable
            onPress={goToPinnedPage}
            style={[
              styles.pinnedJumpButton,
              {
                borderColor: theme.colors.neutral.border,
                backgroundColor: theme.colors.neutral.surface,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons
              name="bookmark-outline"
              size={16}
              color={pinnedPageInRange ? accentColor : theme.colors.neutral.textMuted}
            />
            <AppText
              variant="bodySm"
              color={pinnedPageInRange ? accentColor : theme.colors.neutral.textMuted}
              numberOfLines={1}
              style={styles.pinnedJumpText}
            >
              {t('quran.goToPinnedPage')}
            </AppText>
          </Pressable>

          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary} numberOfLines={1} style={styles.toolbarMeta}>
            {toolbarMeta}
          </AppText>
        </View>
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        data={readerPages}
        keyExtractor={(item) => String(item)}
        initialScrollIndex={readerPages.indexOf(initialPage)}
        extraData={`${readerTheme}-${language}-${numberFormat}`}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: 24 + Math.max(insets.bottom, 0),
          },
        ]}
        viewabilityConfig={viewabilityConfigRef.current}
        onViewableItemsChanged={onViewableItemsChangedRef.current}
        scrollEventThrottle={16}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 240);
        }}
        renderItem={({ item: pageNumber }) => {
          const pageData = getLocalQuranPage(pageNumber);
          const pageSurah = resolveSurahForPage(pageNumber);
          const pageJuz = pageData?.juzNumber ?? pageSurah.juz;

          const pageSections = selectedSurah
            ? (pageData?.sections ?? []).filter((section) => section.chapterId === selectedSurah.id)
            : pageData?.sections ?? [];
          const firstVerse = pageSections[0]?.verses[0]?.number ?? 1;
          const markerIsActive = pinnedMarker?.page === pageNumber;

          return (
            <View style={styles.pageSection}>
              <View
                style={[
                  styles.pageStrip,
                  {
                    borderColor: theme.colors.neutral.border,
                    backgroundColor: isDark ? theme.colors.neutral.surface : theme.colors.neutral.backgroundElevated,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Pressable
                  onPress={() =>
                    togglePinnedMarker({
                      page: pageNumber,
                      surah: pageSurah.id,
                      verse: firstVerse,
                      title: language === 'ar' ? pageSurah.nameAr : pageSurah.nameEn,
                    })
                  }
                  style={[
                    styles.stripSide,
                    isRTL ? styles.stripSideLeadingRtl : styles.stripSideLeadingLtr,
                  ]}
                >
                  <View style={styles.stripIconButton}>
                    <Ionicons
                      name={markerIsActive ? 'bookmark' : 'bookmark-outline'}
                      size={16}
                      color={markerIsActive ? accentColor : theme.colors.neutral.textSecondary}
                    />
                  </View>
                </Pressable>

                <View style={styles.stripCenter}>
                  <View
                    style={[
                      styles.pageBadge,
                      {
                        borderColor: markerIsActive ? accentColor : theme.colors.neutral.borderStrong,
                      },
                    ]}
                  >
                    <AppText
                      variant="label"
                      color={markerIsActive ? accentColor : theme.colors.neutral.textSecondary}
                      style={styles.pageBadgeText}
                    >
                      {pageNumber}
                    </AppText>
                  </View>
                </View>

                <View style={styles.stripSide}>
                  <AppText
                    variant="bodySm"
                    color={theme.colors.neutral.textSecondary}
                    style={[styles.stripMeta, { textAlign: isRTL ? 'right' : 'left' }]}
                  >
                    {t('quran.juz')} {pageJuz}
                  </AppText>
                </View>
              </View>

              {pageSections.some((section) => section.verses.length > 0) ? (
                <View style={styles.pageContentStack}>
                  {pageSections.map((section, sectionIndex) => {
                    const sectionSurah = surahById.get(section.chapterId);
                    const isOpening =
                      !!sectionSurah &&
                      section.verses[0]?.number === 1 &&
                      sectionSurah.startPage === pageNumber;
                    const sectionVerses = section.verses.map((verse) => ({
                      id: verse.id,
                      verseKey: verse.verseKey,
                      number: verse.number,
                      surahId: section.chapterId,
                      surahNameAr: section.chapterNameAr,
                      surahNameEn: section.chapterNameSimple,
                      text: verse.text,
                    })) as ReaderVerse[];

                    return (
                      <View key={`${pageNumber}-${section.chapterId}-${sectionIndex}`} style={styles.sectionBlock}>
                        {isOpening && sectionSurah ? renderSurahIntroCard(sectionSurah) : null}
                        <View style={styles.quranTextWrap}>
                          <Text
                            allowFontScaling={false}
                            textBreakStrategy="simple"
                            lineBreakStrategyIOS="standard"
                            android_hyphenationFrequency="none"
                            style={[
                              styles.quranFlowText,
                              styles.quranFlowArabic,
                              {
                                color: theme.colors.neutral.textPrimary,
                              },
                            ]}
                          >
                            {sectionVerses.map((ayah, index) => (
                              <Text key={`${pageNumber}-${ayah.verseKey}-${index}`}>
                                {ayah.text}
                                <Text
                                  style={[
                                    styles.verseOrnament,
                                    {
                                      color: accentColor,
                                    },
                                  ]}
                                >
                                  {` ﴿${localizeVerseNumber(ayah.number)}﴾`}
                                </Text>
                                {index < sectionVerses.length - 1 ? ' ' : ''}
                              </Text>
                            ))}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary} style={styles.emptyPageText}>
                  {selectedSurah ? t('quran.noSurahData') : t('quran.noPageData')}
                </AppText>
              )}
            </View>
          );
        }}
      />

    </Screen>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    gap: 6,
  },
  headerSide: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    width: '100%',
    textAlign: 'center',
    lineHeight: 27,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinnedJumpButton: {
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 150,
  },
  pinnedJumpText: {
    fontSize: 12,
    lineHeight: 16,
  },
  toolbarMeta: {
    flex: 1,
    lineHeight: 19,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  list: {
    width: '100%',
    alignSelf: 'stretch',
  },
  pageSection: {
    width: '100%',
    alignSelf: 'stretch',
    paddingBottom: 12,
  },
  surahIntroCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 9,
    marginHorizontal: 6,
    gap: 8,
  },
  surahIntroHeader: {
    alignItems: 'center',
    gap: 10,
  },
  surahIntroBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahIntroHeaderText: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  surahIntroTitle: {
    lineHeight: 24,
  },
  surahIntroLatin: {
    lineHeight: 19,
  },
  basmalaText: {
    textAlign: 'center',
    lineHeight: 42,
  },
  pageStrip: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 4,
    marginHorizontal: 6,
  },
  stripSide: {
    width: 72,
    minHeight: 30,
    justifyContent: 'center',
  },
  stripSideLeading: {
    alignItems: 'flex-start',
  },
  stripSideLeadingLtr: {
    alignItems: 'flex-start',
  },
  stripSideLeadingRtl: {
    alignItems: 'flex-end',
  },
  stripCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stripIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pageBadgeText: {
    lineHeight: 18,
  },
  stripMeta: {
    width: '100%',
  },
  quranTextWrap: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: 6,
  },
  pageContentStack: {
    gap: 6,
  },
  sectionBlock: {
    gap: 4,
  },
  quranFlowText: {
    textAlign: 'justify',
    writingDirection: 'rtl',
    fontWeight: '400',
    letterSpacing: 0,
    alignSelf: 'stretch',
    width: '100%',
    paddingHorizontal: 0,
    includeFontPadding: false,
  },
  quranFlowArabic: {
    fontSize: 22,
    lineHeight: 42,
  },
  verseOrnament: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0,
  },
  emptyPageText: {
    textAlign: 'center',
    paddingVertical: 12,
  },
});
