import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { surahList } from '@/constants/quran';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { toArabicDigits, toEnglishDigits } from '@/utils/number';

type SurahItem = (typeof surahList)[number];

type Props = {
  item: SurahItem;
  onPress: () => void;
};

export const QuranSurahRow: React.FC<Props> = ({ item, onPress }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const numberFormat = useAuthStore((s) => s.numberFormat);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const accentColor = mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;
  const revelationLabel =
    item.revelationPlace === 'madinah' ? t('quran.revelationMadinah') : t('quran.revelationMakkah');

  const localizeNumber = (value: number) => {
    const raw = String(value);
    if (numberFormat === 'arabic') return toArabicDigits(raw);
    if (numberFormat === 'english') return toEnglishDigits(raw);
    return language === 'ar' ? toArabicDigits(raw) : toEnglishDigits(raw);
  };

  const metaLine = `${revelationLabel} • ${t('quran.versesCount', { count: item.versesCount })} • ${t('quran.page')} ${localizeNumber(item.startPage)}`;
  const primaryName = language === 'ar' ? item.nameAr : item.nameEn;
  const secondaryName = language === 'ar' ? item.nameEn : item.nameAr;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.neutral.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: theme.colors.brand.mist }]}>
        <AppText variant="label" color={accentColor}>
          {localizeNumber(item.id)}
        </AppText>
      </View>

      <View style={styles.mainBlock}>
        <AppText variant="headingSm" numberOfLines={1} style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {primaryName}
        </AppText>
        <AppText
          variant="bodySm"
          color={theme.colors.neutral.textSecondary}
          numberOfLines={1}
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          {metaLine}
        </AppText>
      </View>

      <View style={styles.secondaryBlock}>
        <AppText
          variant={language === 'ar' ? 'bodyMd' : 'bodySm'}
          color={language === 'ar' ? accentColor : theme.colors.neutral.textSecondary}
          numberOfLines={1}
          style={{ textAlign: isRTL ? 'left' : 'right' }}
        >
          {secondaryName}
        </AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: 12,
    minHeight: 66,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mainBlock: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  secondaryBlock: {
    width: 84,
    minWidth: 84,
  },
});
