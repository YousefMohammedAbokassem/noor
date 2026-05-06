import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { juzList, surahList } from '@/constants/quran';
import { QuranIndexTabs } from '@/features/quran/components/QuranIndexTabs';
import { QuranTopBar } from '@/features/quran/components/QuranTopBar';
import { useKhatmaStore } from '@/state/khatmaStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { useResetFlatListOnFocus } from '@/features/quran/hooks/useResetFlatListOnFocus';
import { toArabicDigits, toEnglishDigits } from '@/utils/number';

type Props = NativeStackScreenProps<RootStackParamList, 'JuzIndex'>;

export const JuzIndexScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const reading = useKhatmaStore((s) => s.readingProgress);
  const pinnedMarker = useKhatmaStore((s) => s.pinnedMarker);
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const numberFormat = useAuthStore((s) => s.numberFormat);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const accentColor = mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;
  const { listRef: juzListRef, handleScroll } = useResetFlatListOnFocus<(typeof juzList)[number]>(
    'quran-juz-index',
  );
  const continuePage = pinnedMarker?.page ?? reading.currentPage;
  const continueSurah =
    surahList.find((item) => item.startPage <= continuePage && item.endPage >= continuePage) ?? surahList[0];
  const surahStartsMap = useMemo(
    () =>
      new Map(
        juzList.map((juz) => [
          juz.id,
          surahList.filter((surah) => surah.startPage >= juz.startPage && surah.startPage <= juz.endPage).length,
        ]),
      ),
    [],
  );

  const localizeNumber = (value: number) => {
    const raw = String(value);
    if (numberFormat === 'arabic') return toArabicDigits(raw);
    if (numberFormat === 'english') return toEnglishDigits(raw);
    return language === 'ar' ? toArabicDigits(raw) : toEnglishDigits(raw);
  };

  return (
    <Screen scroll={false} showDecorations={false} showThemeToggle={false} contentStyle={styles.screen}>
      <QuranTopBar
        title={t('quran.juzIndex')}
        onBack={() => navigation.goBack()}
        rightSlot={<ThemeToggleButton compact />}
      />

      <QuranIndexTabs
        activeTab="juz"
        onPressSurah={() => navigation.navigate('SurahIndex')}
        onPressJuz={() => undefined}
      />

      <Pressable
        onPress={() =>
          navigation.navigate('QuranReader', {
            page: continuePage,
            surah: continueSurah.id,
            juz: continueSurah.juz,
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
            {`${language === 'ar' ? continueSurah.nameAr : continueSurah.nameEn} • ${t('quran.page')} ${continuePage}`}
          </AppText>
        </View>
        <AppText variant="label" color={theme.colors.neutral.textSecondary}>
          30
        </AppText>
      </Pressable>

      <FlatList
        ref={juzListRef}
        data={juzList}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('QuranReader', { page: item.startPage, juz: item.id })}>
            {({ pressed }) => (
              <View
                style={[
                  styles.row,
                  {
                    borderBottomColor: theme.colors.neutral.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    opacity: pressed ? 0.84 : 1,
                  },
                ]}
              >
                <View style={[styles.orderBadge, { backgroundColor: theme.colors.brand.mist }]}>
                  <AppText variant="label" color={accentColor}>
                    {localizeNumber(item.id)}
                  </AppText>
                </View>

                <View style={styles.rowBody}>
                  <AppText variant="headingSm" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                    {language === 'ar' ? item.nameAr : item.nameEn}
                  </AppText>
                  <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                    {t('quran.fromPageTo', { start: item.startPage, end: item.endPage })}
                  </AppText>
                  <AppText variant="bodySm" color={accentColor}>
                    {t('quran.surahStartsCount', { count: surahStartsMap.get(item.id) ?? 0 })}
                  </AppText>
                </View>
              </View>
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
    gap: 10,
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    minHeight: 78,
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  orderBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
});
