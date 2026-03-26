import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { AppText } from './AppText';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export const AppInput: React.FC<Props> = ({ label, error, style, ...props }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" style={{ marginBottom: 8 }}>
        {label}
      </AppText>
      <TextInput
        {...props}
        style={[
          styles.input,
          {
            borderColor: error ? theme.colors.neutral.danger : theme.colors.neutral.borderStrong,
            color: theme.colors.neutral.textPrimary,
            backgroundColor: theme.colors.neutral.surfaceAlt,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
          style,
        ]}
        placeholderTextColor={theme.colors.neutral.textMuted}
      />
      {!!error && (
        <AppText variant="bodySm" color={theme.colors.neutral.danger} style={{ marginTop: 6 }}>
          {error}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 13,
    minHeight: 50,
    paddingHorizontal: 14,
  },
});
