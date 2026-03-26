import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightSlot?: React.ReactNode;
};

export const QuranTopBar: React.FC<Props> = ({ title, subtitle, onBack, rightSlot }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const accentColor = mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;
  const isRTL = language === 'ar';

  return (
    <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          {
            borderColor: theme.colors.neutral.border,
            backgroundColor: theme.colors.neutral.surface,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <Ionicons
          name={isRTL ? 'arrow-forward' : 'arrow-back'}
          size={20}
          color={accentColor}
        />
        <AppText variant="label" color={accentColor}>
          {t('common.back')}
        </AppText>
      </Pressable>

      <View style={styles.textWrap}>
        <AppText variant="headingSm">{title}</AppText>
        {!!subtitle && (
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
            {subtitle}
          </AppText>
        )}
      </View>

      <View style={styles.rightSlot}>{rightSlot}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    minHeight: 44,
    minWidth: 88,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexDirection: 'row',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  rightSlot: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
});
