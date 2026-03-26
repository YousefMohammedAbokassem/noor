import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = {
  progress: number;
};

export const ProgressBar: React.FC<Props> = ({ progress }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const value = Math.max(0, Math.min(100, progress));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.neutral.surfaceMuted, borderColor: theme.colors.neutral.border }]}>
      <View
        style={[
          styles.bar,
          {
            width: `${value}%`,
            backgroundColor: value > 66 ? theme.colors.brand.lightGreen : value > 33 ? theme.colors.brand.gold : theme.colors.brand.darkGreen,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  bar: {
    height: '100%',
    borderRadius: 12,
  },
});
