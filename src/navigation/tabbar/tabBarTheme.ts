import { ThemeMode, getThemeByMode } from '@/theme';

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const tabBarSizes = {
  barHeight: 68,
  centerButton: 56,
  centerButtonLift: 16,
  sideButtonWidth: 74,
  sideButtonHeight: 52,
};

const tabBarFrame = {
  centerButtonBottomOffset: 6,
};

export const getTabBarLayout = (bottomInset: number) => {
  const safeBottomInset = Math.max(bottomInset, 10);
  const barHeight = tabBarSizes.barHeight + safeBottomInset;

  return {
    safeBottomInset,
    barHeight,
    wrapperHeight: barHeight,
    centerButtonBottom: safeBottomInset + tabBarFrame.centerButtonBottomOffset,
  };
};

export const getTabBarTheme = (mode: ThemeMode) => {
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const centerOuter = isDark ? theme.colors.brand.darkGreen : theme.colors.brand.green;

  return {
    colors: {
      bar: theme.colors.neutral.surface,
      barBorder: theme.colors.neutral.borderStrong,
      barTopLine: isDark ? theme.colors.brand.softGold : theme.colors.neutral.borderStrong,
      barInset: withAlpha(theme.colors.neutral.borderStrong, isDark ? 0.08 : 0.12),
      active: isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen,
      inactive: isDark ? '#B8C9BF' : theme.colors.neutral.textMuted,
      tabBubble: isDark ? 'rgba(231, 206, 134, 0.1)' : withAlpha(theme.colors.brand.green, 0.1),
      tabBubbleBorder: withAlpha(theme.colors.neutral.borderStrong, isDark ? 0.16 : 0.28),
      centerOuter,
      centerInner: isDark ? theme.colors.brand.green : theme.colors.brand.lightGreen,
      centerInnerFocused: isDark ? theme.colors.brand.lightGreen : theme.colors.brand.green,
      centerGlow: isDark ? theme.colors.brand.softGold : theme.colors.brand.gold,
      centerRing: withAlpha(centerOuter, isDark ? 0.42 : 0.28),
      centerIcon: isDark ? '#F7E6B4' : '#F8FCF9',
      centerPivot: isDark ? 'rgba(0,0,0,0.34)' : 'rgba(0,0,0,0.24)',
    },
  };
};
