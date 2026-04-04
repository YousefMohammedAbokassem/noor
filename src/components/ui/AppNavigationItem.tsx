import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/state/authStore';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  danger?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export const AppNavigationItem: React.FC<Props> = ({ label, hint, icon, danger = false, onPress, style }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const isDark = mode === 'dark';

  const iconColor = danger
    ? theme.colors.neutral.danger
    : isDark
      ? theme.colors.brand.softGold
      : theme.colors.brand.darkGreen;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.item,
        {
          borderColor: theme.colors.neutral.border,
          backgroundColor: theme.colors.neutral.backgroundElevated,
          opacity: pressed ? 0.86 : 1,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? theme.colors.neutral.surfaceAlt : theme.colors.brand.mist,
            borderColor: isDark ? theme.colors.neutral.border : 'transparent',
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.textWrap}>
        <AppText variant="bodyLg" color={danger ? theme.colors.neutral.danger : undefined}>
          {label}
        </AppText>
        {!!hint && (
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
            {hint}
          </AppText>
        )}
      </View>

      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={danger ? theme.colors.neutral.danger : theme.colors.neutral.textMuted}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  item: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
});
