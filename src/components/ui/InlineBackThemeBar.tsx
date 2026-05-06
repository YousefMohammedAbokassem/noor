import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/state/authStore';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { AppText } from './AppText';
import { ThemeToggleButton } from './ThemeToggleButton';

type Props = {
  onBack: () => void;
};

export const InlineBackThemeBar: React.FC<Props> = ({ onBack }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';
  const accentColor = isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;

  return (
    <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
          {
            borderColor: theme.colors.neutral.border,
            backgroundColor: theme.colors.neutral.surface,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <Ionicons
          name={isRTL ? 'arrow-forward' : 'arrow-back'}
          size={18}
          color={accentColor}
        />
        <AppText variant="label" color={accentColor}>
          {t('common.back')}
        </AppText>
      </Pressable>
      <ThemeToggleButton compact />
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  backButton: {
    minHeight: 40,
    minWidth: 92,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
