import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { AppInput } from '@/components/ui/AppInput';
import { juzList, surahList, TOTAL_QURAN_PAGES } from '@/constants/quran';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateKhatmaStep1'>;

export const CreateKhatmaStep1Screen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [startType, setStartType] = useState<'beginning' | 'juz' | 'surah' | 'page'>('beginning');
  const [value, setValue] = useState('1');
  const numericValue = Math.max(1, Number(value) || 1);

  const startPage = useMemo(() => {
    if (startType === 'beginning') return 1;
    if (startType === 'page') return Math.min(TOTAL_QURAN_PAGES, numericValue);
    if (startType === 'juz') {
      return juzList.find((item) => item.id === numericValue)?.startPage ?? 1;
    }

    return surahList.find((item) => item.id === numericValue)?.startPage ?? 1;
  }, [numericValue, startType]);

  const selectedSurah = startType === 'surah' ? surahList.find((item) => item.id === numericValue) : null;
  const selectedJuz = startType === 'juz' ? juzList.find((item) => item.id === numericValue) : null;

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={require('../../../../assets/logo.webp')} style={styles.logo} resizeMode="contain" />
        <AppText variant="headingMd" style={{ textAlign: 'center' }}>
          {t('khatma.startPrompt')}
        </AppText>
      </View>

      <AppCard style={styles.selectorCard}>
        <View style={styles.selectorGrid}>
          <AppButton
            title={t('khatma.fromBeginning')}
            onPress={() => setStartType('beginning')}
            variant={startType === 'beginning' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('khatma.specificJuz')}
            onPress={() => setStartType('juz')}
            variant={startType === 'juz' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.selectorGrid}>
          <AppButton
            title={t('khatma.specificSurah')}
            onPress={() => setStartType('surah')}
            variant={startType === 'surah' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('khatma.specificPage')}
            onPress={() => setStartType('page')}
            variant={startType === 'page' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
        </View>
      </AppCard>

      {startType !== 'beginning' && (
        <AppInput
          label={
            startType === 'juz'
              ? t('khatma.juzNumberLabel')
              : startType === 'surah'
                ? t('khatma.surahNumberLabel')
                : t('khatma.pageNumberLabel')
          }
          keyboardType="number-pad"
          value={value}
          onChangeText={setValue}
        />
      )}

      <AppCard style={styles.summaryCard}>
        <AppText variant="bodyLg" style={{ textAlign: 'center' }}>
          {t('khatma.startPageSummary', { page: startPage })}
        </AppText>
        {!!selectedSurah && (
          <AppText variant="bodyMd" style={{ textAlign: 'center' }}>
            {t('khatma.selectedSurahSummary', { surah: selectedSurah.nameAr })}
          </AppText>
        )}
        {!!selectedJuz && (
          <AppText variant="bodyMd" style={{ textAlign: 'center' }}>
            {t('khatma.selectedJuzSummary', {
              juz: selectedJuz.nameAr,
              start: selectedJuz.startPage,
              end: selectedJuz.endPage,
            })}
          </AppText>
        )}
      </AppCard>

      <View style={styles.footerButton}>
        <AppButton title={t('common.continue')} onPress={() => navigation.navigate('CreateKhatmaStep2', { startType, startPage })} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  logo: {
    width: 96,
    height: 96,
  },
  selectorCard: {
    gap: 10,
  },
  selectorGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    gap: 8,
  },
  footerButton: {
    marginTop: 'auto',
  },
});
