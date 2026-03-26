import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { AppText } from './AppText';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  style?: ViewStyle;
};

export const AppButton: React.FC<Props> = ({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  style,
}) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';

  const backgroundColor =
    variant === 'primary'
      ? theme.colors.brand.darkGreen
      : variant === 'secondary'
        ? theme.colors.brand.gold
        : variant === 'danger'
          ? theme.colors.neutral.danger
          : theme.colors.neutral.surfaceAlt;

  const textColor =
    variant === 'secondary'
      ? theme.colors.brand.darkGreen
      : variant === 'ghost'
        ? isDark
          ? theme.colors.neutral.textPrimary
          : theme.colors.brand.darkGreen
        : variant === 'danger'
          ? '#2A0E12'
          : theme.colors.neutral.textOnBrand;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor:
            variant === 'ghost'
              ? isDark
                ? theme.colors.neutral.borderStrong
                : theme.colors.brand.darkGreen
              : variant === 'secondary'
                ? '#C2A456'
                : 'transparent',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: variant === 'ghost' ? 0 : isDark ? 0.2 : 0.1,
          shadowRadius: 10,
          elevation: variant === 'ghost' || isDark ? 0 : 2,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <AppText variant="button" color={textColor}>
        {title}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
  },
});
