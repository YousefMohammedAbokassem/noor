import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { surahList } from '@/constants/quran';
import { QuranIndexTabs } from '@/features/quran/components/QuranIndexTabs';
import { QuranSearchField } from '@/features/quran/components/QuranSearchField';
import { QuranSurahRow } from '@/features/quran/components/QuranSurahRow';
import { useKhatmaStore } from '@/state/khatmaStore';
import { useQuranUiStore } from '@/state/quranUiStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { useResetFlatListOnFocus } from '@/features/quran/hooks/useResetFlatListOnFocus';

export const QuranHomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const reading = useKhatmaStore((s) => s.readingProgress);
  const pinnedMarker = useKhatmaStore((s) => s.pinnedMarker);
  const language = useAuthStore((s) => s.language);
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const query = useQuranUiStore((s) => s.surahSearchQuery);
  const setQuery = useQuranUiStore((s) => s.setSurahSearchQuery);
  const { listRef: surahListRef, handleScroll } = useResetFlatListOnFocus<(typeof surahList)[number]>(
    'quran-home-surahs',
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return surahList;

    return surahList.filter((surah) => {
      const text = `${surah.id} ${surah.nameAr} ${surah.nameEn} ${surah.translatedName}`.toLowerCase();
      return text.includes(normalized);
    });
  }, [query]);

  const continuePage = pinnedMarker?.page ?? reading.currentPage;

  const currentSurah =
    surahList.find((item) => item.startPage <= continuePage && item.endPage >= continuePage) ??
    surahList.find((item) => item.id === reading.currentSurah) ??
    surahList[0];

  return (
    <Screen scroll={false} showDecorations={false} showThemeToggle={false} contentStyle={styles.screen}>
      <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.headerTextWrap}>
          <AppText variant="headingLg">{t('quran.homeTitle')}</AppText>
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary} numberOfLines={1}>
            {t('quran.currentReading', {
              surah: language === 'ar' ? currentSurah.nameAr : currentSurah.nameEn,
              page: continuePage,
            })}
          </AppText>
        </View>
        <ThemeToggleButton compact />
      </View>

      <QuranIndexTabs
        activeTab="surah"
        onPressSurah={() => undefined}
        onPressJuz={() => navigation.navigate('JuzIndex')}
      />

      <Pressable
        onPress={() =>
          navigation.navigate('QuranReader', {
            page: continuePage,
            surah: currentSurah.id,
            juz: currentSurah.juz,
          })
        }
        style={[
          styles.continueStrip,
          {
            borderColor: theme.colors.neutral.border,
            backgroundColor: theme.colors.neutral.surfaceAlt,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={[styles.continueIcon, { backgroundColor: theme.colors.brand.mist }]}>
          <Ionicons
            name="play-outline"
            size={18}
            color={mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}
          />
        </View>
        <View style={styles.continueTextWrap}>
          <AppText variant="label">{t('quran.continueFromLast')}</AppText>
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary} numberOfLines={1}>
            {`${language === 'ar' ? currentSurah.nameAr : currentSurah.nameEn} • ${t('quran.page')} ${continuePage}`}
          </AppText>
        </View>
      </Pressable>

      <QuranSearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t('quran.searchPlaceholder')}
      />

      <FlatList
        ref={surahListRef}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={[styles.emptyState, { borderColor: theme.colors.neutral.border }]}>
            <AppText variant="headingSm">{t('quran.noResults')}</AppText>
            <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
              {t('quran.tryAnotherSearch')}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <QuranSurahRow
            item={item}
            onPress={() =>
              navigation.navigate('QuranReader', {
                page: item.startPage,
                surah: item.id,
                juz: item.juz,
              })
            }
          />
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 8,
    paddingBottom: 4,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  continueStrip: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  continueIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
});
