import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { juzList, surahList, TOTAL_QURAN_PAGES } from '@/constants/quran';
import { useKhatmaStore } from '@/state/khatmaStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getLocalQuranPage } from '@/data/quran';
import { getThemeByMode } from '@/theme';
import { toArabicDigits, toEnglishDigits } from '@/utils/number';
import { VerseTafsirPanel } from '@/features/quran/components/VerseTafsirPanel';
import { getVerseTafsir, type VerseTafsirData } from '@/features/quran/services/tafsir';
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

type SelectedVerse = ReaderVerse & {
  pageNumber: number;
};

const allMushafPages = Array.from({ length: TOTAL_QURAN_PAGES }, (_, i) => i + 1);
const TAFSIR_SHEET_HIDDEN_OFFSET = 900;
const TAFSIR_SHEET_CLOSE_THRESHOLD = 120;

const buildPageRange = (startPage: number, endPage: number) => {
  const start = Math.max(1, Math.min(startPage, endPage));
  const end = Math.max(start, Math.max(startPage, endPage));
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const shouldRenderBasmala = (surahId: number) => surahId !== 9;

export const QuranReaderScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
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
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [isTafsirPanelOpen, setIsTafsirPanelOpen] = useState(false);
  const [currentTafsir, setCurrentTafsir] = useState<VerseTafsirData | null>(null);
  const currentPageRef = useRef(initialPage);
  const listRef = useRef<FlatList<number>>(null);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 55 });
  const panelTranslateY = useRef(new Animated.Value(TAFSIR_SHEET_HIDDEN_OFFSET)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!selectedVerse || !currentTafsir) return;

    if (isTafsirPanelOpen) {
      Animated.parallel([
        Animated.timing(panelTranslateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(panelOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    Animated.parallel([
      Animated.timing(panelTranslateY, {
        toValue: TAFSIR_SHEET_HIDDEN_OFFSET,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && !isTafsirPanelOpen) {
        setSelectedVerse(null);
        setCurrentTafsir(null);
      }
    });
  }, [currentTafsir, isTafsirPanelOpen, panelOpacity, panelTranslateY, selectedVerse]);

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
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }

    Alert.alert(t('quran.noPinnedPageTitle'), message);
  }, [t]);

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
  const localizeVerseNumber = (value: number) => {
    const raw = String(value);
    if (numberFormat === 'arabic') return toArabicDigits(raw);
    if (numberFormat === 'english') return toEnglishDigits(raw);
    return language === 'ar' ? toArabicDigits(raw) : toEnglishDigits(raw);
  };

  const localizeSurahName = useCallback(
    (verse: Pick<ReaderVerse, 'surahNameAr' | 'surahNameEn'>) =>
      language === 'ar' ? verse.surahNameAr : verse.surahNameEn,
    [language],
  );

  const showInlineFeedback = useCallback(
    (message: string, title?: string) => {
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
        return;
      }

      Alert.alert(title ?? t('quran.reader'), message);
    },
    [t],
  );

  const buildFallbackTafsir = useCallback(
    (verse: SelectedVerse): VerseTafsirData => ({
      source: t('quran.tafsirFallbackSource'),
      title: t('quran.tafsirFallbackTitle'),
      text: t('quran.tafsirFallbackBody', {
        surah: localizeSurahName(verse),
        ayah: localizeVerseNumber(verse.number),
      }),
    }),
    [localizeSurahName, t, numberFormat, language],
  );

  const closeTafsirPanel = useCallback(() => {
    if (!isTafsirPanelOpen && !selectedVerse) return;

    setIsTafsirPanelOpen(false);
  }, [isTafsirPanelOpen, selectedVerse]);

  const restoreTafsirPanelPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(panelTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 220,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [panelOpacity, panelTranslateY]);

  const panelPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (event, gestureState) =>
          isTafsirPanelOpen &&
          event.nativeEvent.locationY < 72 &&
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          const nextTranslateY = Math.max(0, gestureState.dy);
          panelTranslateY.setValue(nextTranslateY);
          panelOpacity.setValue(Math.max(0.4, 1 - nextTranslateY / TAFSIR_SHEET_HIDDEN_OFFSET));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (
            gestureState.dy > TAFSIR_SHEET_CLOSE_THRESHOLD ||
            gestureState.vy > 1.1
          ) {
            closeTafsirPanel();
            return;
          }

          restoreTafsirPanelPosition();
        },
        onPanResponderTerminate: () => {
          restoreTafsirPanelPosition();
        },
      }),
    [closeTafsirPanel, isTafsirPanelOpen, panelOpacity, panelTranslateY, restoreTafsirPanelPosition],
  );

  const handleVersePress = useCallback(
    (verse: ReaderVerse, pageNumber: number) => {
      const nextSelectedVerse: SelectedVerse = {
        ...verse,
        pageNumber,
      };

      const isSameVerse =
        selectedVerse?.pageNumber === nextSelectedVerse.pageNumber &&
        selectedVerse?.verseKey === nextSelectedVerse.verseKey;

      if (isSameVerse && isTafsirPanelOpen) {
        setIsTafsirPanelOpen(false);
        return;
      }

      setSelectedVerse(nextSelectedVerse);
      setCurrentTafsir(getVerseTafsir(nextSelectedVerse.surahId, nextSelectedVerse.number) ?? buildFallbackTafsir(nextSelectedVerse));
      setIsTafsirPanelOpen(true);
    },
    [buildFallbackTafsir, isTafsirPanelOpen, selectedVerse],
  );

  const buildTafsirShareMessage = useCallback(
    (verse: SelectedVerse, tafsir: VerseTafsirData) =>
      [
        verse.text,
        `${t('quran.surah')} ${localizeSurahName(verse)} • ${t('quran.verseLabel')} ${localizeVerseNumber(verse.number)}`,
        `${t('quran.tafsirTitle')} - ${tafsir.title}`,
        tafsir.text,
      ].join('\n\n'),
    [localizeSurahName, t, numberFormat, language],
  );

  const shareCurrentVerseTafsir = useCallback(async () => {
    if (!selectedVerse || !currentTafsir) return;

    try {
      await Share.share({
        message: buildTafsirShareMessage(selectedVerse, currentTafsir),
      });
    } catch {
      showInlineFeedback(t('quran.shareFailed'));
    }
  }, [buildTafsirShareMessage, currentTafsir, selectedVerse, showInlineFeedback, t]);

  const copyCurrentVerseTafsir = useCallback(async () => {
    if (!selectedVerse || !currentTafsir) return;

    await Clipboard.setStringAsync(buildTafsirShareMessage(selectedVerse, currentTafsir));
    showInlineFeedback(t('quran.copiedVerseTafsir'));
  }, [buildTafsirShareMessage, currentTafsir, selectedVerse, showInlineFeedback, t]);

  return (
    <Screen
      scroll={false}
      showDecorations={false}
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
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View style={styles.headerSide}>
            <Pressable onPress={goBack} style={styles.iconButton}>
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={accentColor}
              />
            </Pressable>
          </View>

          <View style={styles.headerCenter} pointerEvents="none">
            <AppText variant="headingSm" numberOfLines={1} style={styles.headerTitle}>
              {headerTitle}
            </AppText>
          </View>

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
        </View>

        <View style={[styles.toolbarRow, { borderTopColor: theme.colors.neutral.border }]}>
          <Pressable
            onPress={goToPinnedPage}
            style={[
              styles.pinnedJumpButton,
              {
                borderColor: theme.colors.neutral.border,
                backgroundColor: theme.colors.neutral.surface,
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
        extraData={`${selectedVerse?.verseKey ?? 'none'}-${selectedVerse?.pageNumber ?? 0}-${isTafsirPanelOpen ? 'open' : 'closed'}-${readerTheme}-${language}-${numberFormat}`}
        scrollEnabled={!isTafsirPanelOpen}
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

          const allVerses = pageSections.flatMap((section) => section.verses.map((verse) => ({
            id: verse.id,
            verseKey: verse.verseKey,
            number: verse.number,
            surahId: section.chapterId,
            surahNameAr: section.chapterNameAr,
            surahNameEn: section.chapterNameSimple,
            text: verse.text,
          })));

          const firstVerse = allVerses[0]?.number ?? 1;
          const markerIsActive = pinnedMarker?.page === pageNumber;
          const isOpeningOfSelectedSurah = !!selectedSurah && pageNumber === selectedSurah.startPage;
          const selectedVerseOnPage =
            isTafsirPanelOpen && selectedVerse?.pageNumber === pageNumber ? selectedVerse : null;
          const revelationLabel = selectedSurah?.revelationPlace === 'madinah'
            ? t('quran.revelationMadinah')
            : t('quran.revelationMakkah');

          return (
            <View style={styles.pageSection}>
              {isOpeningOfSelectedSurah && selectedSurah ? (
                <View
                  style={[
                    styles.surahIntroCard,
                    {
                      borderColor: theme.colors.neutral.borderStrong,
                      backgroundColor: isDark ? theme.colors.neutral.surfaceAlt : theme.colors.neutral.backgroundElevated,
                    },
                  ]}
                >
                  <AppText variant="headingSm" style={styles.surahIntroTitle}>
                    {selectedSurah.nameAr}
                  </AppText>
                  <AppText variant="bodySm" color={theme.colors.neutral.textSecondary} style={styles.surahIntroLatin}>
                    {selectedSurah.nameEn}
                  </AppText>
                  <View style={[styles.surahIntroDivider, { backgroundColor: theme.colors.neutral.border }]} />
                  <AppText variant="bodySm" color={theme.colors.neutral.textSecondary} style={styles.surahIntroMeta}>
                    {`${revelationLabel} • ${t('quran.versesCount', { count: selectedSurah.versesCount })} • ${t('quran.juz')} ${selectedSurah.juz}`}
                  </AppText>
                  {shouldRenderBasmala(selectedSurah.id) && (
                    <AppText variant="headingMd" style={[styles.basmalaText, { color: accentColor }]}>
                      {t('quran.basmalaFallback')}
                    </AppText>
                  )}
                </View>
              ) : null}

              <View
                style={[
                  styles.pageStrip,
                  {
                    borderColor: theme.colors.neutral.border,
                    backgroundColor: isDark ? theme.colors.neutral.surface : theme.colors.neutral.backgroundElevated,
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
                  style={[styles.stripSide, styles.stripSideLeading]}
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

              {allVerses.length ? (
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
                    {allVerses.map((ayah, index) => {
                      const isSelected = selectedVerseOnPage?.verseKey === ayah.verseKey;

                      return (
                        <Text
                          key={`${pageNumber}-${ayah.verseKey}-${index}`}
                          onPress={() => handleVersePress(ayah, pageNumber)}
                          suppressHighlighting
                          style={
                            isSelected
                              ? [
                                  styles.verseTextSelected,
                                  {
                                    borderColor: isDark
                                      ? 'rgba(231, 206, 134, 0.44)'
                                      : 'rgba(18, 55, 42, 0.2)',
                                    backgroundColor: isDark
                                      ? 'rgba(231, 206, 134, 0.14)'
                                      : 'rgba(18, 55, 42, 0.08)',
                                    color: isDark ? theme.colors.neutral.textPrimary : theme.colors.brand.darkGreen,
                                  },
                                ]
                              : undefined
                          }
                        >
                          {ayah.text}
                          <Text
                            style={[
                              styles.verseOrnament,
                              {
                                color: isSelected
                                  ? isDark
                                    ? theme.colors.brand.softGold
                                    : theme.colors.brand.green
                                  : accentColor,
                              },
                              isSelected ? styles.verseOrnamentSelected : undefined,
                            ]}
                          >
                            {` ﴿${localizeVerseNumber(ayah.number)}﴾`}
                          </Text>
                          {index < allVerses.length - 1 ? ' ' : ''}
                        </Text>
                      );
                    })}
                  </Text>
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

      {selectedVerse && currentTafsir ? (
        <>
          <Animated.View
            pointerEvents={isTafsirPanelOpen ? 'auto' : 'none'}
            style={[
              styles.sheetBackdrop,
              {
                opacity: panelOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.22],
                }),
              },
            ]}
          >
            <Pressable onPress={closeTafsirPanel} style={StyleSheet.absoluteFillObject} />
          </Animated.View>

          <Animated.View
            pointerEvents={isTafsirPanelOpen ? 'auto' : 'none'}
            {...panelPanResponder.panHandlers}
            style={[
              styles.bottomPanelWrap,
              {
                top: insets.top + 84,
                bottom: Math.max(insets.bottom, 8) + 8,
                opacity: panelOpacity,
                transform: [{ translateY: panelTranslateY }],
              },
            ]}
          >
            <VerseTafsirPanel
              accentColor={accentColor}
              copyLabel={t('quran.copyVerseTafsir')}
              isDark={isDark}
              isRTL={isRTL}
              onClose={closeTafsirPanel}
              onCopy={copyCurrentVerseTafsir}
              onShare={shareCurrentVerseTafsir}
              shareLabel={t('quran.shareVerseTafsir')}
              surahName={localizeSurahName(selectedVerse)}
              tafsir={currentTafsir}
              theme={theme}
              verseBadgeLabel={t('quran.verseBadge', { number: selectedVerse.number })}
            />
          </Animated.View>
        </>
      ) : null}
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
    alignItems: 'center',
    marginBottom: 9,
    marginHorizontal: 6,
    gap: 4,
  },
  surahIntroTitle: {
    textAlign: 'center',
  },
  surahIntroLatin: {
    textAlign: 'center',
    lineHeight: 20,
  },
  surahIntroDivider: {
    height: 1,
    width: '76%',
    marginVertical: 2,
  },
  surahIntroMeta: {
    textAlign: 'center',
  },
  basmalaText: {
    marginTop: 2,
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
  verseTextSelected: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  verseOrnamentSelected: {
    fontWeight: '800',
  },
  emptyPageText: {
    textAlign: 'center',
    paddingVertical: 12,
  },
  bottomPanelWrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
});
