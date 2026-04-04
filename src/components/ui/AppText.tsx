import React from 'react';
import { Text, TextProps } from 'react-native';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { toArabicDigits, toEnglishDigits } from '@/utils/number';

type Variant = 'headingLg' | 'headingMd' | 'headingSm' | 'bodyLg' | 'bodyMd' | 'bodySm' | 'label' | 'button';

type Props = TextProps & {
  variant?: Variant;
  color?: string;
  direction?: 'locale' | 'ltr' | 'rtl';
};

export const AppText: React.FC<Props> = ({ variant = 'bodyMd', color, style, direction = 'locale', ...props }) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const numberFormat = useAuthStore((s) => s.numberFormat);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const resolvedDirection = direction === 'locale' ? (isRTL ? 'rtl' : 'ltr') : direction;
  const normalizeDigits = (value: string) => {
    if (numberFormat === 'arabic') return toArabicDigits(value);
    if (numberFormat === 'english') return toEnglishDigits(value);
    return language === 'ar' ? toArabicDigits(value) : toEnglishDigits(value);
  };

  const localizeNode = (node: React.ReactNode): React.ReactNode => {
    if (typeof node === 'string') return normalizeDigits(node);
    if (typeof node === 'number') return normalizeDigits(String(node));
    if (Array.isArray(node)) return node.map((item, index) => <React.Fragment key={index}>{localizeNode(item)}</React.Fragment>);
    return node;
  };

  return (
    <Text
      {...props}
      style={[
        theme.typography[variant],
        {
          color: color ?? theme.colors.neutral.textPrimary,
          textAlign: resolvedDirection === 'rtl' ? 'right' : 'left',
          writingDirection: resolvedDirection,
        },
        style,
      ]}
    >
      {localizeNode(props.children)}
    </Text>
  );
};
