import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { adhkarCategories, adhkarItems } from '@/constants/adhkar';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DhikrContent'>;

type DividerIconConfig = {
  name: keyof typeof Ionicons.glyphMap;
  rotation?: `${number}deg`;
};

const dividerIconByCategoryId: Record<string, DividerIconConfig> = {
  morning: { name: 'sunny-outline' },
  evening: { name: 'moon-outline' },
  sleep: { name: 'bed-outline' },
  after_prayer: { name: 'time-outline' },
  mosque: { name: 'business-outline' },
  supplications: { name: 'sparkles-outline' },
  quranic: { name: 'book-outline' },
  travel: { name: 'airplane-outline', rotation: '-45deg' },
  ruqyah: { name: 'shield-checkmark-outline' },
};

export const DhikrContentScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';

  const group = useMemo(
    () => adhkarItems.filter((item) => item.categoryId === route.params.categoryId),
    [route.params.categoryId],
  );
  const category = useMemo(
    () => adhkarCategories.find((item) => item.id === route.params.categoryId),
    [route.params.categoryId],
  );
  const dividerIcon = dividerIconByCategoryId[route.params.categoryId] ?? { name: 'sparkles-outline' as const };

  const [remainingByDhikr, setRemainingByDhikr] = useState<Record<string, number>>(() =>
    group.reduce<Record<string, number>>((acc, item) => {
      acc[item.id] = item.repeat;
      return acc;
    }, {}),
  );

  const decrementDhikr = (id: string) => {
    setRemainingByDhikr((prev) => {
      const current = prev[id] ?? 0;
      if (current <= 0) return prev;
      return {
        ...prev,
        [id]: current - 1,
      };
    });
  };

  const dividerStyle = isDark
    ? {
        linePrimary: 'rgba(231, 206, 134, 0.55)',
        lineSecondary: 'rgba(132, 153, 142, 0.45)',
        dot: 'rgba(231, 206, 134, 0.75)',
        wrapBackground: '#1A2C24',
        wrapBorder: 'rgba(231, 206, 134, 0.65)',
        iconColor: theme.colors.brand.softGold,
      }
    : {
        linePrimary: 'rgba(31, 94, 73, 0.35)',
        lineSecondary: 'rgba(201, 166, 70, 0.35)',
        dot: 'rgba(31, 94, 73, 0.65)',
        wrapBackground: '#F9F2E1',
        wrapBorder: 'rgba(201, 166, 70, 0.8)',
        iconColor: theme.colors.brand.gold,
      };

  if (!group.length) {
    return (
      <Screen showDecorations={false} showThemeToggle={false}>
        <AppText variant="headingSm">{t('adhkar.noContent')}</AppText>
      </Screen>
    );
  }

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      <AppCard style={[styles.headerCard, { backgroundColor: theme.colors.brand.darkGreen, borderColor: theme.colors.brand.green }]}>
        <AppText variant="headingSm" color={theme.colors.neutral.textOnBrand} style={styles.headerTitle}>
          {language === 'ar' ? category?.titleAr ?? t('adhkar.categories') : category?.titleEn ?? t('adhkar.categories')}
        </AppText>
        <AppText variant="bodySm" color="#D0DFD7" style={styles.headerSubtitle}>
          {t('adhkar.readAllHint')}
        </AppText>
      </AppCard>

      {group.map((item, index) => {
        const remaining = remainingByDhikr[item.id] ?? item.repeat;
        const isCompleted = remaining <= 0;

        return (
          <React.Fragment key={item.id}>
            <Pressable onPress={() => decrementDhikr(item.id)}>
              {({ pressed }) => (
                <AppCard
                  style={[
                    styles.dhikrCard,
                    {
                      borderColor: isCompleted ? theme.colors.neutral.success : theme.colors.neutral.borderStrong,
                      backgroundColor: isCompleted
                        ? isDark
                          ? '#1D3B2B'
                          : '#EDF8EF'
                        : theme.colors.neutral.surface,
                      opacity: pressed ? 0.92 : 1,
                    },
                  ]}
                >
                  <View style={[styles.topRow, isRTL && styles.rowReverse]}>
                    <View style={[styles.indexBadge, { backgroundColor: theme.colors.brand.mist }]}>
                      <AppText variant="label" color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}>
                        {index + 1}
                      </AppText>
                    </View>

                    <View
                      style={[
                        styles.repeatBadge,
                        isRTL && styles.rowReverse,
                        {
                          borderColor: isCompleted ? theme.colors.neutral.success : theme.colors.neutral.border,
                          backgroundColor: isCompleted ? 'rgba(40,122,59,0.15)' : theme.colors.neutral.backgroundElevated,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isCompleted ? 'checkmark-circle-outline' : 'refresh-outline'}
                        size={15}
                        color={isCompleted ? theme.colors.neutral.success : theme.colors.neutral.textSecondary}
                      />
                      <AppText variant="bodySm" color={isCompleted ? theme.colors.neutral.success : theme.colors.neutral.textSecondary}>
                        {isCompleted ? t('adhkar.completed') : t('adhkar.remainingCount', { count: remaining })}
                      </AppText>
                    </View>
                  </View>

                  <AppText variant="bodyLg" style={styles.arabicText}>
                    {item.textAr}
                  </AppText>

                  {!!item.source && (
                    <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                      {t('adhkar.source')}: {item.source}
                    </AppText>
                  )}

                  {!!item.virtue && (
                    <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                      {t('adhkar.virtue')}: {item.virtue}
                    </AppText>
                  )}
                </AppCard>
              )}
            </Pressable>

            {index < group.length - 1 && (
              <View style={styles.dividerRow}>
                <View style={styles.dividerSide}>
                  <View style={[styles.dividerDot, { backgroundColor: dividerStyle.dot }]} />
                  <View style={[styles.dividerLinePrimary, { backgroundColor: dividerStyle.linePrimary }]} />
                  <View style={[styles.dividerLineSecondary, { backgroundColor: dividerStyle.lineSecondary }]} />
                </View>
                <View
                  style={[
                    styles.dividerIconWrap,
                    {
                      borderColor: dividerStyle.wrapBorder,
                      backgroundColor: dividerStyle.wrapBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name={dividerIcon.name}
                    size={14}
                    color={dividerStyle.iconColor}
                    style={dividerIcon.rotation ? { transform: [{ rotate: dividerIcon.rotation }] } : undefined}
                  />
                </View>
                <View style={[styles.dividerSide, styles.dividerSideReverse]}>
                  <View style={[styles.dividerDot, { backgroundColor: dividerStyle.dot }]} />
                  <View style={[styles.dividerLinePrimary, { backgroundColor: dividerStyle.linePrimary }]} />
                  <View style={[styles.dividerLineSecondary, { backgroundColor: dividerStyle.lineSecondary }]} />
                </View>
              </View>
            )}
          </React.Fragment>
        );
      })}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 26,
    gap: 10,
  },
  headerCard: {
    gap: 4,
  },
  headerTitle: {
    textAlign: 'center',
  },
  headerSubtitle: {
    textAlign: 'center',
  },
  dhikrCard: {
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  indexBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  repeatBadge: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  arabicText: {
    textAlign: 'right',
    lineHeight: 42,
    fontSize: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  dividerSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dividerSideReverse: {
    flexDirection: 'row-reverse',
  },
  dividerLinePrimary: {
    flex: 1,
    height: 1,
  },
  dividerLineSecondary: {
    width: 28,
    height: 1,
    opacity: 0.9,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dividerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
