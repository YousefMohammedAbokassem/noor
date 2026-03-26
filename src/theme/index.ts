import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';

export type ThemeMode = 'light' | 'dark';

export const getThemeByMode = (mode: ThemeMode) => {
  if (mode === 'dark') {
    return {
      colors: {
        ...colors,
        brand: {
          ...colors.brand,
          mist: '#24382F',
        },
        neutral: {
          ...colors.neutral,
          background: colors.dark.background,
          backgroundElevated: colors.dark.backgroundElevated,
          surface: colors.dark.surface,
          surfaceAlt: colors.dark.surfaceAlt,
          surfaceMuted: colors.dark.surfaceMuted,
          border: colors.dark.border,
          borderStrong: colors.dark.borderStrong,
          textPrimary: colors.dark.textPrimary,
          textSecondary: colors.dark.textSecondary,
          textMuted: colors.dark.textMuted,
          textOnBrand: colors.dark.textOnBrand,
          danger: colors.dark.danger,
          success: colors.dark.success,
          warning: colors.dark.warning,
          info: colors.dark.info,
        },
      },
      spacing,
      typography,
    };
  }

  return { colors, spacing, typography };
};

export type Theme = ReturnType<typeof getThemeByMode>;
