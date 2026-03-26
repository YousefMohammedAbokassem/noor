import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = {
  compact?: boolean;
};

export const ThemeToggleButton: React.FC<Props> = ({ compact = false }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const setReaderTheme = useSettingsStore((s) => s.setReaderTheme);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const size = compact ? 38 : 44;

  return (
    <Pressable
      onPress={() => setReaderTheme(isDark ? 'light' : 'dark')}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderColor: theme.colors.neutral.border,
          backgroundColor: theme.colors.neutral.surface,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="toggle-theme"
    >
      <Ionicons
        name={isDark ? 'sunny' : 'moon'}
        size={compact ? 17 : 19}
        color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
