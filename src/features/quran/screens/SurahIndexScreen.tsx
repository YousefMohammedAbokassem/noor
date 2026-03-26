import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { surahList } from '@/constants/quran';
import { QuranTopBar } from '@/features/quran/components/QuranTopBar';
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
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';
  const accentColor = isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;
  const surahListRef = useResetFlatListOnFocus<(typeof surahList)[number]>();

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
    <Screen scroll={false} contentStyle={styles.screen}>
      <QuranTopBar
        title={t('quran.surahIndex')}
        subtitle={t('quran.surahIndexSubtitle')}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={[styles.counterBadge, { backgroundColor: theme.colors.brand.mist }]}>
            <AppText variant="bodySm" color={accentColor}>
              {filteredSurahs.length}
            </AppText>
          </View>
        }
      />

      <AppCard style={styles.heroCard}>
        <View style={[styles.heroCircle, { backgroundColor: theme.colors.brand.softGold }]} />
        <Ionicons name="book-outline" size={28} color={accentColor} />
        <AppText variant="headingLg">{t('quran.homeTitle')}</AppText>
        <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary}>
          {t('quran.surahHeroDescription')}
        </AppText>
        <View style={styles.heroActions}>
          <AppButton
            title={`${t('home.continueReading')} ${language === 'ar' ? currentSurah.nameAr : currentSurah.nameEn}`}
            variant="secondary"
            onPress={() =>
              navigation.navigate('QuranReader', {
                page: continuePage,
                surah: currentSurah.id,
                juz: currentSurah.juz,
              })
            }
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('quran.juzIndex')}
            variant="ghost"
            onPress={() => navigation.navigate('JuzIndex')}
            style={{ flex: 1 }}
          />
        </View>
      </AppCard>

      <AppInput
        label={t('quran.searchSurah')}
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
        ListEmptyComponent={
          <AppCard>
            <AppText variant="headingSm">{t('quran.noResults')}</AppText>
            <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
              {t('quran.tryAnotherSearch')}
            </AppText>
          </AppCard>
        }
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
            <AppCard style={styles.card}>
              <View style={[styles.orderBadge, { backgroundColor: theme.colors.brand.mist }]}>
                <AppText variant="label" color={accentColor}>
                  {item.id}
                </AppText>
              </View>

              <View style={styles.cardBody}>
                <AppText variant="headingSm">{language === 'ar' ? item.nameAr : item.nameEn}</AppText>
                <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                  {t('quran.surahMeta', { start: item.startPage, end: item.endPage, verses: item.versesCount })}
                </AppText>
              </View>

              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={accentColor}
              />
            </AppCard>
          </Pressable>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: 14,
  },
  counterBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    gap: 12,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    top: -36,
    left: -28,
    opacity: 0.22,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderBadge: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
});
