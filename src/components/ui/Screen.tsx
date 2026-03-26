import React, { PropsWithChildren } from 'react';
import { ScrollView, StatusBar, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { ThemeToggleButton } from './ThemeToggleButton';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  showDecorations?: boolean;
  showThemeToggle?: boolean;
}>;

export const Screen: React.FC<Props> = ({
  scroll = true,
  children,
  contentStyle,
  showDecorations = true,
  showThemeToggle = false,
}) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const actionsAlign = language === 'ar' ? 'flex-start' : 'flex-end';

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          direction,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {showThemeToggle && (
        <View style={[styles.topActionRow, { alignItems: actionsAlign }]}>
          <ThemeToggleButton />
        </View>
      )}
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        {
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          direction,
        },
        contentStyle,
      ]}
    >
      {showThemeToggle && (
        <View style={[styles.topActionRow, { alignItems: actionsAlign }]}>
          <ThemeToggleButton />
        </View>
      )}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.neutral.background, direction }]}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} />
      {showDecorations && (
        <>
          <View
            style={[
              styles.blobOne,
              {
                backgroundColor: mode === 'dark' ? theme.colors.brand.lightGreen : theme.colors.brand.softGold,
                opacity: mode === 'dark' ? 0.08 : 0.12,
              },
            ]}
          />
          <View
            style={[
              styles.blobTwo,
              {
                backgroundColor: mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.lightGreen,
                opacity: mode === 'dark' ? 0.05 : 0.08,
              },
            ]}
          />
        </>
      )}
      {body}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  topActionRow: {
    width: '100%',
    marginBottom: 2,
  },
  blobOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    top: -80,
    right: -70,
  },
  blobTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 999,
    bottom: -60,
    left: -50,
  },
});
