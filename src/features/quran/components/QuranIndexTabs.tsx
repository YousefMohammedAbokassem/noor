import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';

type Props = {
  activeTab: 'surah' | 'juz';
  onPressSurah: () => void;
  onPressJuz: () => void;
};

export const QuranIndexTabs: React.FC<Props> = ({ activeTab, onPressSurah, onPressJuz }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const accentColor = mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;

  const renderTab = (key: 'surah' | 'juz', label: string, onPress: () => void) => {
    const active = activeTab === key;

    return (
      <Pressable
        key={key}
        onPress={onPress}
        style={({ pressed }) => [
          styles.tabButton,
          {
            backgroundColor: active ? theme.colors.neutral.surface : 'transparent',
            borderColor: active ? theme.colors.neutral.borderStrong : 'transparent',
            opacity: pressed ? 0.88 : 1,
          },
        ]}
      >
        <AppText variant="label" color={active ? accentColor : theme.colors.neutral.textSecondary}>
          {label}
        </AppText>
        {active ? <View style={[styles.activeBar, { backgroundColor: accentColor }]} /> : null}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.neutral.surfaceAlt,
          borderColor: theme.colors.neutral.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      {renderTab('surah', t('quran.surahTab'), onPressSurah)}
      {renderTab('juz', t('quran.juzTab'), onPressJuz)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 16,
    padding: 3,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  activeBar: {
    width: 28,
    height: 3,
    borderRadius: 999,
  },
});
