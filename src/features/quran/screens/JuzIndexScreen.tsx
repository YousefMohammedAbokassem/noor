import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { juzList, surahList } from '@/constants/quran';
import { QuranTopBar } from '@/features/quran/components/QuranTopBar';
import { useKhatmaStore } from '@/state/khatmaStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { useResetFlatListOnFocus } from '@/features/quran/hooks/useResetFlatListOnFocus';

type Props = NativeStackScreenProps<RootStackParamList, 'JuzIndex'>;

export const JuzIndexScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const reading = useKhatmaStore((s) => s.readingProgress);
  const pinnedMarker = useKhatmaStore((s) => s.pinnedMarker);
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';
  const accentColor = isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;
  const juzListRef = useResetFlatListOnFocus<(typeof juzList)[number]>();
  const continuePage = pinnedMarker?.page ?? reading.currentPage;
  const continueSurah =
    surahList.find((item) => item.startPage <= continuePage && item.endPage >= continuePage) ?? surahList[0];

  return (
    <Screen scroll={false} showDecorations={false} showThemeToggle={false} contentStyle={styles.screen}>
      <QuranTopBar
        title={t('quran.juzIndex')}
        subtitle={t('quran.juzIndexSubtitle')}
        onBack={() => navigation.goBack()}
        rightSlot={
          <View style={styles.topActions}>
            <View style={[styles.counterBadge, { backgroundColor: theme.colors.brand.mist }]}>
              <AppText variant="bodySm" color={accentColor}>
                30
              </AppText>
            </View>
            <ThemeToggleButton compact />
          </View>
        }
      />

      <AppCard style={styles.heroCard}>
        <Ionicons name="layers-outline" size={28} color={accentColor} />
        <AppText variant="headingLg">{t('quran.juzIndex')}</AppText>
        <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary}>
          {t('quran.juzHeroDescription')}
        </AppText>
        <View style={styles.heroActions}>
          <AppButton
            title={t('home.continueReading')}
            variant="secondary"
            onPress={() =>
              navigation.navigate('QuranReader', {
                page: continuePage,
                surah: continueSurah.id,
                juz: continueSurah.juz,
              })
            }
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('quran.surahIndex')}
            variant="ghost"
            onPress={() => navigation.navigate('SurahIndex')}
            style={{ flex: 1 }}
          />
        </View>
      </AppCard>

      <FlatList
        ref={juzListRef}
        data={juzList}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('QuranReader', { page: item.startPage, juz: item.id })}>
            <AppCard style={styles.card}>
              <View style={[styles.orderBadge, { backgroundColor: theme.colors.brand.mist }]}>
                <AppText variant="label" color={accentColor}>
                  {item.id}
                </AppText>
              </View>

              <View style={styles.cardBody}>
                <AppText variant="headingSm">{language === 'ar' ? item.nameAr : item.nameEn}</AppText>
                <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                  {t('quran.fromPageTo', { start: item.startPage, end: item.endPage })}
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
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCard: {
    gap: 12,
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
  },
});
