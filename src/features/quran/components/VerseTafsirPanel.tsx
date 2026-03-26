import React from 'react';
import { Pressable, ScrollView, StyleSheet, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { Theme } from '@/theme';
import { VerseTafsirData } from '../services/tafsir';

type Props = {
  accentColor: string;
  copyLabel: string;
  isDark: boolean;
  isRTL: boolean;
  onClose: () => void;
  onCopy: () => void;
  onShare: () => void;
  shareLabel: string;
  surahName: string;
  tafsir: VerseTafsirData;
  theme: Theme;
  verseBadgeLabel: string;
};

const toRgba = (hex: string, alpha: number) => {
  if (!hex.startsWith('#')) return hex;

  const normalized =
    hex.length === 4
      ? `#${hex
          .slice(1)
          .split('')
          .map((char) => `${char}${char}`)
          .join('')}`
      : hex;

  if (normalized.length !== 7) return hex;

  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const blurViewAvailable = (() => {
  const getViewManagerConfig = (UIManager as { getViewManagerConfig?: (name: string) => unknown }).getViewManagerConfig;
  if (typeof getViewManagerConfig !== 'function') return false;

  return Boolean(
    getViewManagerConfig('ExpoBlurView') ||
      getViewManagerConfig('ViewManagerAdapter_ExpoBlur_ExpoBlurView'),
  );
})();

export const VerseTafsirPanel: React.FC<Props> = React.memo(
  ({
    accentColor,
    copyLabel,
    isDark,
    isRTL,
    onClose,
    onCopy,
    onShare,
    shareLabel,
    surahName,
    tafsir,
    theme,
    verseBadgeLabel,
  }) => {
    const insets = useSafeAreaInsets();
    const panelFallbackTone = toRgba(theme.colors.neutral.surface, isDark ? 0.96 : 0.98);
    const panelOverlay = blurViewAvailable
      ? toRgba(theme.colors.neutral.background, isDark ? 0.28 : 0.46)
      : panelFallbackTone;
    const actionTone = toRgba(theme.colors.neutral.surfaceAlt, isDark ? 0.76 : 0.9);
    const badgeTone = toRgba(theme.colors.neutral.surface, isDark ? 0.8 : 0.94);

    return (
      <View
        style={[
          styles.panel,
          {
            backgroundColor: panelFallbackTone,
            borderColor: theme.colors.neutral.borderStrong,
            shadowColor: isDark ? '#000000' : accentColor,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {blurViewAvailable ? (
          <BlurView
            intensity={28}
            tint={isDark ? 'dark' : 'light'}
            style={styles.blurLayer}
            pointerEvents="none"
          />
        ) : null}
        <View pointerEvents="none" style={[styles.panelColorOverlay, { backgroundColor: panelOverlay }]} />

        <View style={styles.panelContent}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={surahName}
            onPress={onClose}
            style={styles.handleButton}
          >
            <View style={[styles.handle, { backgroundColor: theme.colors.neutral.borderStrong }]} />
          </Pressable>

          <View
            style={[
              styles.topRow,
              {
                borderBottomColor: theme.colors.neutral.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View
              style={[
                styles.actionsWrap,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Pressable
                onPress={onShare}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: actionTone,
                    borderColor: theme.colors.neutral.borderStrong,
                  },
                ]}
              >
                <Ionicons name="share-social-outline" size={15} color={accentColor} />
                <AppText variant="label" color={accentColor} style={styles.actionLabel}>
                  {shareLabel}
                </AppText>
              </Pressable>

              <Pressable
                onPress={onCopy}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: actionTone,
                    borderColor: theme.colors.neutral.borderStrong,
                  },
                ]}
              >
                <Ionicons name="copy-outline" size={15} color={accentColor} />
                <AppText variant="label" color={accentColor} style={styles.actionLabel}>
                  {copyLabel}
                </AppText>
              </Pressable>
            </View>

            <View style={[styles.metaWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <AppText variant="label" style={styles.surahName}>
                {surahName}
              </AppText>
              <View
                style={[
                  styles.verseBadge,
                  {
                    borderColor: accentColor,
                    backgroundColor: badgeTone,
                  },
                ]}
              >
                <AppText variant="label" color={accentColor} style={styles.verseBadgeText}>
                  {verseBadgeLabel}
                </AppText>
              </View>
            </View>
          </View>

          <ScrollView
            bounces={false}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <AppText variant="bodySm" color={theme.colors.neutral.textSecondary} style={styles.sourceLabel}>
              {tafsir.source}
            </AppText>

            <AppText variant="headingSm" style={styles.title}>
              {tafsir.title}
            </AppText>

            <AppText
              variant="bodyMd"
              color={theme.colors.neutral.textPrimary}
              style={[
                styles.body,
                {
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
            >
              {tafsir.text}
            </AppText>
          </ScrollView>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 4,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 12,
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  panelColorOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  panelContent: {
    flex: 1,
  },
  handleButton: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  topRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionsWrap: {
    flex: 1,
    flexWrap: 'wrap',
    gap: 9,
  },
  actionButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  metaWrap: {
    minWidth: 112,
    gap: 7,
  },
  surahName: {
    textAlign: 'center',
  },
  verseBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  verseBadgeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  sourceLabel: {
    marginBottom: 8,
  },
  title: {
    marginBottom: 12,
  },
  body: {
    lineHeight: 28,
  },
});
