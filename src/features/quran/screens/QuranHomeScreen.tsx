import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { InlineBackThemeBar } from '@/components/ui/InlineBackThemeBar';
import { goBackSmart } from '@/navigation/goBackSmart';
import { surahList } from '@/constants/quran';
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
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';
  const query = useQuranUiStore((s) => s.surahSearchQuery);
  const setQuery = useQuranUiStore((s) => s.setSurahSearchQuery);
  const surahListRef = useResetFlatListOnFocus<(typeof surahList)[number]>();

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

  const goBack = () => {
    goBackSmart(navigation);
  };

  return (
    <Screen scroll={false} showDecorations={false} showThemeToggle={false} contentStyle={styles.screen}>
      <InlineBackThemeBar onBack={goBack} />

      <AppCard style={[styles.heroCard, { backgroundColor: theme.colors.brand.darkGreen, borderColor: theme.colors.brand.green }]}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="book-outline" size={24} color={theme.colors.brand.softGold} />
          </View>
          <View style={styles.heroTextWrap}>
            <AppText variant="headingSm" color={theme.colors.neutral.textOnBrand}>
              {t('quran.homeTitle')}
            </AppText>
            <AppText variant="bodySm" color="#D5E4DB">
              {t('quran.homeSubtitle')}
            </AppText>
          </View>
          <View
            style={[
              styles.counterBadge,
              {
                backgroundColor: 'rgba(255,255,255,0.14)',
                borderColor: 'rgba(255,255,255,0.2)',
              },
            ]}
          >
            <AppText variant="label" color={theme.colors.neutral.textOnBrand}>
              {surahList.length}
            </AppText>
          </View>
        </View>

        <View style={styles.heroActions}>
          <AppButton
            title={t('quran.continueFromLast')}
                onPress={() =>
                  navigation.navigate('QuranReader', {
                    page: continuePage,
                    surah: currentSurah.id,
                    juz: currentSurah.juz,
                  })
                }
            variant="secondary"
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('quran.juzIndex')}
            onPress={() => navigation.navigate('JuzIndex')}
            variant="ghost"
            style={{ flex: 1 }}
          />
        </View>

        <AppText variant="bodySm" color="#C8DAD0">
              {t('quran.currentReading', {
                surah: language === 'ar' ? currentSurah.nameAr : currentSurah.nameEn,
                page: continuePage,
              })}
            </AppText>
          </AppCard>

      <AppInput
        label={t('quran.searchSurah')}
        placeholder={t('quran.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        ref={surahListRef}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate('QuranReader', {
                page: item.startPage,
                surah: item.id,
                juz: item.juz,
              })
            }
          >
            {({ pressed }) => (
              <AppCard style={[styles.surahCard, pressed && styles.surahCardPressed]}>
                <View style={[styles.orderBadge, { backgroundColor: theme.colors.brand.mist }]}>
                  <AppText variant="label" color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}>
                    {item.id}
                  </AppText>
                </View>

                <View style={styles.surahTextWrap}>
                  <AppText variant="headingSm">{language === 'ar' ? item.nameAr : item.nameEn}</AppText>
                  <AppText variant="bodySm" color={theme.colors.neutral.textMuted}>
                    {t('quran.surahMeta', {
                      start: item.startPage,
                      end: item.endPage,
                      verses: item.versesCount,
                    })}
                  </AppText>
                </View>

                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={20}
                  color={theme.colors.neutral.textSecondary}
                />
              </AppCard>
            )}
          </Pressable>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 12,
    paddingBottom: 8,
  },
  heroCard: {
    gap: 12,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231,206,134,0.15)',
  },
  heroTextWrap: {
    flex: 1,
    gap: 2,
  },
  counterBadge: {
    minWidth: 40,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  surahCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  surahCardPressed: {
    opacity: 0.88,
  },
  orderBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahTextWrap: {
    flex: 1,
    gap: 1,
  },
});
