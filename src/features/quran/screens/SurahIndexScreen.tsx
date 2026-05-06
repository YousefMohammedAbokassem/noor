import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { surahList } from '@/constants/quran';
import { QuranTopBar } from '@/features/quran/components/QuranTopBar';
import { QuranIndexTabs } from '@/features/quran/components/QuranIndexTabs';
import { QuranSearchField } from '@/features/quran/components/QuranSearchField';
import { QuranSurahRow } from '@/features/quran/components/QuranSurahRow';
import { useKhatmaStore } from '@/state/khatmaStore';
import { useQuranUiStore } from '@/state/quranUiStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { useResetFlatListOnFocus } from '@/features/quran/hooks/useResetFlatListOnFocus';

type Props = NativeStackScreenProps<RootStackParamList, 'SurahIndex'>;

export const SurahIndexScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const query = useQuranUiStore((s) => s.surahSearchQuery);
  const setQuery = useQuranUiStore((s) => s.setSurahSearchQuery);
  const reading = useKhatmaStore((s) => s.readingProgress);
  const pinnedMarker = useKhatmaStore((s) => s.pinnedMarker);
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const { listRef: surahListRef, handleScroll } = useResetFlatListOnFocus<(typeof surahList)[number]>(
    'quran-surah-index',
  );

  const filteredSurahs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return surahList;
    }

    return surahList.filter((item) => {
      const haystack = [
        item.id,
        item.nameAr,
        item.nameEn,
        item.translatedName,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [query]);

  const continuePage = pinnedMarker?.page ?? reading.currentPage;

  const currentSurah =
    surahList.find((item) => item.startPage <= continuePage && item.endPage >= continuePage) ??
    surahList.find((item) => item.id === reading.currentSurah) ??
    surahList[0];

  return (
    <Screen scroll={false} showDecorations={false} showThemeToggle={false} contentStyle={styles.screen}>
      <QuranTopBar
        title={t('quran.surahIndex')}
        onBack={() => navigation.goBack()}
        rightSlot={<ThemeToggleButton compact />}
      />

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
        <View style={styles.continueTextWrap}>
          <AppText variant="label">{t('quran.continueFromLast')}</AppText>
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary} numberOfLines={1}>
            {`${language === 'ar' ? currentSurah.nameAr : currentSurah.nameEn} • ${t('quran.page')} ${continuePage}`}
          </AppText>
        </View>
        <AppText variant="label" color={theme.colors.neutral.textSecondary}>
          {filteredSurahs.length}
        </AppText>
      </Pressable>

      <QuranSearchField
        placeholder={t('quran.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        ref={surahListRef}
        data={filteredSurahs}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    gap: 10,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  continueStrip: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
  },
  continueTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
});
