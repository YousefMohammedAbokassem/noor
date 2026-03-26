import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export const AppCard: React.FC<Props> = ({ children, style }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.neutral.surface,
          borderColor: theme.colors.neutral.borderStrong,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.22 : 0.08,
          shadowRadius: 12,
          elevation: isDark ? 0 : 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
});
