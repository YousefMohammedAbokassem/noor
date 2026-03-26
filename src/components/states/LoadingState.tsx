import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import i18n from '@/i18n';

export const LoadingState: React.FC<{ label?: string }> = ({ label = i18n.t('common.loading') }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';

  return (
    <AppCard style={{ alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 }}>
      <ActivityIndicator color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen} size="large" />
      <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary} style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </AppCard>
  );
};
