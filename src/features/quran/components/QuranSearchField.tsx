import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';

type Props = {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
};

export const QuranSearchField: React.FC<Props> = ({ value, placeholder, onChangeText }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const accentColor = mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.colors.neutral.border,
          backgroundColor: theme.colors.neutral.surfaceAlt,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Ionicons name="search-outline" size={18} color={theme.colors.neutral.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.neutral.textMuted}
        style={[
          styles.input,
          {
            color: theme.colors.neutral.textPrimary,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        ]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color={accentColor} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
