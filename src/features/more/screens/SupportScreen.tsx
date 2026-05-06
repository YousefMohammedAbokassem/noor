import React, { useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { useAppAlert } from '@/components/ui/AppAlertProvider';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { toEnglishDigits } from '@/utils/number';

type PaymentMethodId = 'google' | 'apple' | 'card';
type PaymentMethodStatus = 'recommended' | 'ready' | 'coming_soon' | 'unavailable';
type PaymentMethodOption = {
  id: PaymentMethodId;
  title: string;
  hint: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  providerKey: string;
  status: PaymentMethodStatus;
};

const presetAmounts = [19, 39, 79, 149];
const preferredMethod: PaymentMethodId = Platform.OS === 'ios' ? 'apple' : 'google';

const sanitizeAmountInput = (value: string) => {
  const normalized = toEnglishDigits(value)
    .replace(/[^\d.,]/g, '')
    .replace(/,/g, '.');
  const [integerPart = '', ...decimalParts] = normalized.split('.');
  const decimalPart = decimalParts.join('').slice(0, 2);

  return decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
};

const parseAmount = (value: string) => {
  if (!value.trim()) return null;
  const numeric = Number(sanitizeAmountInput(value));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getStatusLabel = (status: PaymentMethodStatus, t: ReturnType<typeof useTranslation>['t']) => {
  switch (status) {
    case 'recommended':
      return t('support.recommended');
    case 'ready':
      return t('support.connectReady');
    case 'coming_soon':
      return t('support.comingSoon');
    case 'unavailable':
    default:
      return t('support.unavailableOnDevice');
  }
};

export const SupportScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { showAlert } = useAppAlert();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isArabic = (i18n.resolvedLanguage ?? i18n.language).startsWith('ar');
  const isRTL = isArabic;
  const currency = isArabic ? 'د.إ' : 'AED';
  const [selectedAmount, setSelectedAmount] = useState(presetAmounts[1]);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId>(preferredMethod);

  const paymentMethods = useMemo<PaymentMethodOption[]>(
    () => [
      {
        id: 'google',
        title: t('support.googleBilling'),
        hint: t('support.googleHint'),
        icon: 'google-play',
        providerKey: 'google_play_billing',
        status: Platform.OS === 'android' ? 'recommended' : 'unavailable',
      },
      {
        id: 'apple',
        title: t('support.applePurchase'),
        hint: t('support.appleHint'),
        icon: 'apple',
        providerKey: 'apple_iap',
        status: Platform.OS === 'ios' ? 'recommended' : 'unavailable',
      },
      {
        id: 'card',
        title: t('support.cardPayment'),
        hint: t('support.cardHint'),
        icon: 'credit-card-outline',
        providerKey: 'external_card_gateway',
        status: 'ready',
      },
    ],
    [t],
  );

  const resolvedAmount = parseAmount(customAmount) ?? selectedAmount;
  const activeMethod = paymentMethods.find((item) => item.id === selectedMethod) ?? paymentMethods[0];
  const summaryAmount = `${resolvedAmount.toFixed(2)} ${currency}`;
  const heroCardBackground = isDark ? theme.colors.brand.darkGreen : theme.colors.brand.green;
  const heroCardBorder = isDark ? 'rgba(231,206,134,0.18)' : 'rgba(18,55,42,0.14)';
  const softPanel = isDark ? theme.colors.neutral.surfaceAlt : theme.colors.brand.mist;
  const softPanelBorder = isDark ? theme.colors.neutral.borderStrong : theme.colors.neutral.border;

  const handleCheckoutPreview = () => {
    const draft = {
      amount: resolvedAmount,
      currency,
      methodId: activeMethod.id,
      providerKey: activeMethod.providerKey,
      status: activeMethod.status,
    };

    showAlert(
      t('support.previewTitle'),
      `${t('support.summaryAmount')}: ${draft.amount.toFixed(2)} ${draft.currency}\n${t('support.summaryMethod')}: ${activeMethod.title}\n${t('support.summaryStatus')}: ${getStatusLabel(draft.status, t)}\n${t('support.paymentPending')}`,
    );
  };

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      <AppCard
        style={[
          styles.heroCard,
          {
            backgroundColor: heroCardBackground,
            borderColor: heroCardBorder,
          },
        ]}
      >
        <View style={[styles.heroGlowLarge, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={[styles.heroGlowSmall, { backgroundColor: 'rgba(231,206,134,0.12)' }]} />

        <View style={[styles.heroTop, isRTL && styles.rowReverse]}>
          <View style={[styles.heroCopy, isRTL && styles.textWrapRtl]}>
            <AppText variant="headingLg" color={theme.colors.neutral.textOnBrand}>
              {t('support.title')}
            </AppText>
            <AppText variant="bodyMd" color="rgba(248,252,249,0.84)">
              {t('support.subtitle')}
            </AppText>
            <AppText variant="bodySm" color="rgba(248,252,249,0.72)">
              {t('support.heroHint')}
            </AppText>
          </View>

          <Image
            source={require('../../../../assets/support-hero.webp')}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={[styles.badgesRow, isRTL && styles.rowReverse]}>
          {[t('support.oneTimeBadge'), t('support.secureBadge'), t('support.optionalBadge')].map((label) => (
            <View key={label} style={styles.badgePill}>
              <AppText variant="label" color={theme.colors.brand.softGold}>
                {label}
              </AppText>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="label">{t('support.chooseAmount')}</AppText>
        <View style={[styles.amountGrid, isRTL && styles.rowReverse]}>
          {presetAmounts.map((amount) => {
            const selected = !parseAmount(customAmount) && selectedAmount === amount;
            return (
              <Pressable
                key={amount}
                onPress={() => {
                  setCustomAmount('');
                  setSelectedAmount(amount);
                }}
                style={({ pressed }) => [
                  styles.amountOption,
                  {
                    backgroundColor: selected
                      ? isDark
                        ? theme.colors.brand.green
                        : theme.colors.brand.darkGreen
                      : softPanel,
                    borderColor: selected ? theme.colors.brand.softGold : softPanelBorder,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <AppText variant="headingSm" color={selected ? theme.colors.neutral.textOnBrand : undefined}>
                  {amount.toFixed(0)} {currency}
                </AppText>
                <AppText
                  variant="bodySm"
                  color={selected ? 'rgba(248,252,249,0.76)' : theme.colors.neutral.textSecondary}
                >
                  {t('support.oneTimeBadge')}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.customAmountWrap}>
          <AppText variant="label">{t('support.customAmount')}</AppText>
          <View
            style={[
              styles.customAmountField,
              isRTL && styles.rowReverse,
              {
                backgroundColor: softPanel,
                borderColor: softPanelBorder,
              },
            ]}
          >
            <TextInput
              value={customAmount}
              onChangeText={(value) => setCustomAmount(sanitizeAmountInput(value))}
              keyboardType="decimal-pad"
              placeholder={t('support.customAmountPlaceholder')}
              placeholderTextColor={theme.colors.neutral.textMuted}
              style={[
                styles.customAmountInput,
                {
                  color: theme.colors.neutral.textPrimary,
                  textAlign: isRTL ? 'right' : 'left',
                  writingDirection: isRTL ? 'rtl' : 'ltr',
                },
              ]}
            />
            <View
              style={[
                styles.currencyChip,
                {
                  backgroundColor: isDark ? 'rgba(231,206,134,0.12)' : 'rgba(18,55,42,0.08)',
                },
              ]}
            >
              <AppText variant="label" color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}>
                {currency}
              </AppText>
            </View>
          </View>
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="label">{t('support.paymentMethod')}</AppText>
        <View style={styles.methodsList}>
          {paymentMethods.map((option) => {
            const selected = option.id === selectedMethod;
            const selectable = option.status !== 'unavailable';
            const statusLabel = getStatusLabel(option.status, t);

            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  if (selectable) {
                    setSelectedMethod(option.id);
                  }
                }}
                style={({ pressed }) => [
                  styles.methodCard,
                  isRTL && styles.rowReverse,
                  {
                    backgroundColor: selected
                      ? isDark
                        ? 'rgba(46,125,95,0.18)'
                        : 'rgba(18,55,42,0.06)'
                      : softPanel,
                    borderColor: selected ? theme.colors.brand.softGold : softPanelBorder,
                    opacity: !selectable ? 0.58 : pressed ? 0.92 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.methodIconWrap,
                    {
                      backgroundColor: selected
                        ? isDark
                          ? 'rgba(231,206,134,0.16)'
                          : 'rgba(18,55,42,0.08)'
                        : theme.colors.neutral.surface,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={22}
                    color={selected ? theme.colors.brand.softGold : theme.colors.brand.green}
                  />
                </View>

                <View style={[styles.methodCopy, isRTL && styles.textWrapRtl]}>
                  <View style={[styles.methodHeader, isRTL && styles.rowReverse]}>
                    <AppText variant="bodyLg">{option.title}</AppText>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: selected
                            ? isDark
                              ? 'rgba(231,206,134,0.16)'
                              : 'rgba(18,55,42,0.08)'
                            : theme.colors.neutral.surface,
                        },
                      ]}
                    >
                      <AppText
                        variant="bodySm"
                        color={selected ? theme.colors.brand.softGold : theme.colors.neutral.textSecondary}
                      >
                        {statusLabel}
                      </AppText>
                    </View>
                  </View>

                  <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                    {option.hint}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard style={styles.summaryCard}>
        <AppText variant="headingSm">{t('support.summaryTitle')}</AppText>

        <View style={[styles.summaryRow, isRTL && styles.rowReverse]}>
          <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary}>
            {t('support.summaryAmount')}
          </AppText>
          <AppText variant="headingSm" direction="ltr">
            {summaryAmount}
          </AppText>
        </View>

        <View style={[styles.summaryRow, isRTL && styles.rowReverse]}>
          <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary}>
            {t('support.summaryMethod')}
          </AppText>
          <AppText variant="bodyLg">{activeMethod.title}</AppText>
        </View>

        <View style={[styles.summaryRow, isRTL && styles.rowReverse]}>
          <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary}>
            {t('support.summaryStatus')}
          </AppText>
          <AppText
            variant="bodyLg"
            color={activeMethod.status === 'unavailable' ? theme.colors.neutral.warning : theme.colors.brand.softGold}
          >
            {getStatusLabel(activeMethod.status, t)}
          </AppText>
        </View>

        <View
          style={[
            styles.pendingBanner,
            isRTL && styles.rowReverse,
            {
              backgroundColor: isDark ? 'rgba(231,206,134,0.08)' : 'rgba(18,55,42,0.05)',
              borderColor: isDark ? 'rgba(231,206,134,0.14)' : 'rgba(18,55,42,0.1)',
            },
          ]}
        >
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={18}
            color={isDark ? theme.colors.brand.softGold : theme.colors.brand.green}
          />
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary} style={styles.pendingText}>
            {t('support.paymentPending')}
          </AppText>
        </View>
      </AppCard>

      <AppButton title={t('support.checkoutAction')} onPress={handleCheckoutPreview} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: 28,
  },
  heroCard: {
    overflow: 'hidden',
    gap: 18,
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 999,
    top: -60,
    right: -50,
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    bottom: -28,
    left: -18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  textWrapRtl: {
    alignItems: 'flex-end',
  },
  heroImage: {
    width: 110,
    height: 110,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgePill: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(231,206,134,0.16)',
  },
  sectionCard: {
    gap: 12,
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  amountOption: {
    minWidth: '47%',
    flexGrow: 1,
    minHeight: 86,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  customAmountWrap: {
    gap: 8,
  },
  customAmountField: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customAmountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    writingDirection: 'ltr',
  },
  currencyChip: {
    minWidth: 58,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  methodsList: {
    gap: 10,
  },
  methodCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCopy: {
    flex: 1,
    gap: 6,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusPill: {
    minHeight: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  summaryCard: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingBanner: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pendingText: {
    flex: 1,
  },
});
