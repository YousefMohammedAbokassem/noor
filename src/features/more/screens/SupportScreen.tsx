import React, { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';

const amounts = [38.99, 76.99, 194.99, 384.99];

export const SupportScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(76.99);
  const [method, setMethod] = useState<'google' | 'apple'>('google');
  const isArabic = (i18n.resolvedLanguage ?? i18n.language).startsWith('ar');
  const currency = isArabic ? 'د.إ' : 'AED';

  return (
    <Screen showDecorations={false}>
      <AppCard style={styles.hero}>
        <Image source={require('../../../../assets/support-hero.png')} style={styles.heroImage} resizeMode="contain" />
        <AppText variant="headingLg" style={styles.centerText}>
          {t('support.title')}
        </AppText>
        <AppText variant="bodyLg" style={styles.centerText}>
          {t('support.subtitle')}
        </AppText>
      </AppCard>

      <AppCard>
        <AppText variant="label">{t('support.chooseAmount')}</AppText>
        <View style={styles.amountRow}>
          {amounts.map((amount) => (
            <AppButton
              key={amount}
              title={`${amount.toFixed(2)} ${currency}`}
              onPress={() => setSelected(amount)}
              variant={selected === amount ? 'primary' : 'ghost'}
              style={styles.amountButton}
            />
          ))}
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="label">{t('support.paymentMethod')}</AppText>
        <View style={styles.methods}>
          <AppButton
            title={t('support.googleBilling')}
            onPress={() => setMethod('google')}
            variant={method === 'google' ? 'secondary' : 'ghost'}
          />
          <AppButton
            title={t('support.applePurchase')}
            onPress={() => setMethod('apple')}
            variant={method === 'apple' ? 'secondary' : 'ghost'}
          />
        </View>
      </AppCard>

      <AppButton
        title={t('support.action')}
        onPress={() =>
          Alert.alert(
            t('support.title'),
            `${currency} ${selected.toFixed(2)} • ${method === 'google' ? t('support.googleBilling') : t('support.applePurchase')}`,
          )
        }
      />
      <AppText variant="bodySm" style={styles.centerText}>
        {t('support.paymentPending')}
      </AppText>
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 8,
  },
  heroImage: {
    width: 114,
    height: 114,
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  amountButton: {
    minWidth: 102,
  },
  methods: {
    marginTop: 10,
    gap: 8,
  },
  centerText: {
    textAlign: 'center',
  },
});
