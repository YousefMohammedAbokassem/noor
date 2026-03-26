import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { AppText } from './AppText';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
};

export const SwitchRow: React.FC<Props> = ({ label, value, onValueChange, description }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.colors.neutral.borderStrong,
          backgroundColor: theme.colors.neutral.surfaceAlt,
        },
      ]}
    >
      <View style={styles.content}>
        <AppText variant="label">{label}</AppText>
        {!!description && <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>{description}</AppText>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        thumbColor={value ? theme.colors.brand.gold : isDark ? '#728179' : '#D4D7D4'}
        trackColor={{ true: theme.colors.brand.darkGreen, false: isDark ? '#49564F' : '#C3C8C4' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 64,
    paddingHorizontal: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  content: {
    flex: 1,
    gap: 3,
  },
});
