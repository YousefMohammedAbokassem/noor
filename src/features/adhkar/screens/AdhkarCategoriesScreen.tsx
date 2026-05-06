import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { InlineBackThemeBar } from '@/components/ui/InlineBackThemeBar';
import { goBackSmart } from '@/navigation/goBackSmart';
import { adhkarCategories, adhkarItems } from '@/constants/adhkar';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  sun: 'sunny-outline',
  moon: 'moon-outline',
  bed: 'bed-outline',
  clock: 'time-outline',
  home: 'business-outline',
  book: 'book-outline',
  'book-open': 'bookmarks-outline',
  navigation: 'airplane-outline',
  shield: 'shield-checkmark-outline',
};

const iconBgMap: Record<string, string> = {
  morning: '#1F5E49',
  evening: '#204D7A',
  sleep: '#5F3D8A',
  after_prayer: '#2E6A45',
  mosque: '#8A5C23',
  supplications: '#2A7C57',
  quranic: '#7C6A1F',
  travel: '#1E6B76',
  ruqyah: '#416628',
};

export const AdhkarCategoriesScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';

  const itemCountByCategory = useMemo(
    () =>
      adhkarItems.reduce<Record<string, number>>((acc, item) => {
        acc[item.categoryId] = (acc[item.categoryId] ?? 0) + 1;
        return acc;
      }, {}),
    [],
  );

  const goBack = () => {
    goBackSmart(navigation);
  };

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      <InlineBackThemeBar onBack={goBack} />

      <Animated.View
        entering={FadeIn.duration(240)}
        style={[styles.hero, { backgroundColor: theme.colors.brand.darkGreen, borderColor: theme.colors.brand.green }]}
      >
        <View style={[styles.heroTopRow, isRTL && styles.rowReverse]}>
          <AppText variant="headingSm" color={theme.colors.neutral.textOnBrand}>
            {t('adhkar.categories')}
          </AppText>
          <View style={styles.heroBadge}>
            <AppText variant="label" color="#FFFFFF">
              {t('adhkar.totalCategories', { count: adhkarCategories.length })}
            </AppText>
          </View>
        </View>
        <AppText variant="bodySm" color="#D0DFD7">
          {t('adhkar.categoriesSubtitle')}
        </AppText>
      </Animated.View>

      <View style={styles.listWrap}>
        {adhkarCategories.map((item, index) => {
          const count = itemCountByCategory[item.id] ?? 0;

          return (
            <Animated.View key={item.id} entering={FadeInDown.delay(70 + index * 30).duration(280)}>
              <Pressable
                onPress={() => navigation.navigate('DhikrContent', { categoryId: item.id })}
                style={({ pressed }) => [styles.cardPressable, pressed && styles.cardPressed]}
              >
                <View
                  style={[
                    styles.card,
                    isRTL && styles.rowReverse,
                    {
                      borderColor: theme.colors.neutral.borderStrong,
                      backgroundColor: theme.colors.neutral.surface,
                    },
                  ]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: iconBgMap[item.id] ?? '#1F5E49' }]}>
                    <Ionicons name={iconMap[item.icon] ?? 'ellipse-outline'} size={22} color="#FFFFFF" />
                  </View>

                  <View style={[styles.textWrap, isRTL && styles.textWrapRtl]}>
                    <AppText variant="headingSm">{language === 'ar' ? item.titleAr : item.titleEn}</AppText>
                  </View>

                  <View style={styles.trailing}>
                    <View style={[styles.countBadge, { borderColor: theme.colors.neutral.border, backgroundColor: theme.colors.brand.mist }]}>
                      <AppText variant="label" color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}>
                        {count}
                      </AppText>
                    </View>
                    <Ionicons
                      name={isRTL ? 'chevron-back' : 'chevron-forward'}
                      size={18}
                      color={theme.colors.neutral.textSecondary}
                    />
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 6,
    paddingBottom: 24,
    gap: 12,
  },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 7,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  heroBadge: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  listWrap: {
    gap: 10,
  },
  cardPressable: {
    borderRadius: 16,
  },
  cardPressed: {
    opacity: 0.9,
  },
  card: {
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  textWrapRtl: {
    alignItems: 'flex-end',
  },
  trailing: {
    minWidth: 44,
    alignItems: 'center',
    gap: 7,
  },
  countBadge: {
    minWidth: 34,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
