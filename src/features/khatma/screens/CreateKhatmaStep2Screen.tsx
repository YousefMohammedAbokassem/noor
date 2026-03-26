import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { useKhatmaStore } from '@/state/khatmaStore';
import { useSettingsStore } from '@/state/settingsStore';
import { TOTAL_QURAN_PAGES } from '@/constants/quran';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateKhatmaStep2'>;

export const CreateKhatmaStep2Screen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'duration' | 'daily'>('duration');
  const [duration, setDuration] = useState(30);
  const [dailyPages, setDailyPages] = useState(20);
  const createKhatma = useKhatmaStore((s) => s.createKhatma);
  const themeMode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(themeMode);

  const pagesRemaining = TOTAL_QURAN_PAGES - route.params.startPage + 1;

  const computedPlan = useMemo(() => {
    if (mode === 'duration') {
      const normalizedDays = Math.max(1, duration);
      const computedDaily = Math.max(1, Math.ceil(pagesRemaining / normalizedDays));
      return { durationDays: normalizedDays, dailyPages: computedDaily };
    }

    const normalizedDaily = Math.max(1, dailyPages);
    const computedDuration = Math.max(1, Math.ceil(pagesRemaining / normalizedDaily));
    return { durationDays: computedDuration, dailyPages: normalizedDaily };
  }, [dailyPages, duration, mode, pagesRemaining]);

  const submit = () => {
    createKhatma({
      startType: route.params.startType,
      startPage: route.params.startPage,
      durationDays: computedPlan.durationDays,
      dailyPages: computedPlan.dailyPages,
    });

    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <Screen showDecorations={false} contentStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={require('../../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <AppText variant="headingMd" style={{ textAlign: 'center' }}>
          {t('khatma.planPrompt')}
        </AppText>
      </View>

      <AppCard>
        <View style={styles.modeRow}>
          <AppButton
            title={t('khatma.byDuration')}
            onPress={() => setMode('duration')}
            variant={mode === 'duration' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('khatma.byDailyWird')}
            onPress={() => setMode('daily')}
            variant={mode === 'daily' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
        </View>
      </AppCard>

      <AppCard style={styles.counterCard}>
        <AppText variant="label" style={{ textAlign: 'center' }}>
          {mode === 'duration' ? t('khatma.durationDaysLabel') : t('khatma.dailyPagesLabel')}
        </AppText>
        <View style={styles.counterRow}>
          <AppButton
            title="+"
            variant="ghost"
            onPress={() =>
              mode === 'duration'
                ? setDuration((prev) => Math.min(365, prev + 1))
                : setDailyPages((prev) => Math.min(50, prev + 1))
            }
            style={styles.counterButton}
          />
          <View
            style={[
              styles.valueBox,
              {
                borderColor: theme.colors.neutral.borderStrong,
                backgroundColor: theme.colors.neutral.surfaceAlt,
              },
            ]}
          >
            <AppText variant="headingLg" style={{ textAlign: 'center' }}>
              {mode === 'duration' ? duration : dailyPages}
            </AppText>
          </View>
          <AppButton
            title="-"
            variant="ghost"
            onPress={() =>
              mode === 'duration'
                ? setDuration((prev) => Math.max(1, prev - 1))
                : setDailyPages((prev) => Math.max(1, prev - 1))
            }
            style={styles.counterButton}
          />
        </View>
      </AppCard>

      <AppCard style={styles.summaryCard}>
        <AppText variant="bodyMd" style={{ textAlign: 'center' }}>
          {t('khatma.startingFromPage', { page: route.params.startPage })}
        </AppText>
        <AppText variant="bodyMd" style={{ textAlign: 'center' }}>
          {t('khatma.pagesRemaining', { count: pagesRemaining })}
        </AppText>
        <AppText variant="bodyLg" style={{ textAlign: 'center' }}>
          {t('khatma.planSummary', { daily: computedPlan.dailyPages, days: computedPlan.durationDays })}
        </AppText>
      </AppCard>

      <View style={styles.footerButton}>
        <AppButton title={t('common.continue')} onPress={submit} />
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
    width: 122,
    height: 66,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  counterCard: {
    gap: 12,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterButton: {
    width: 70,
  },
  valueBox: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  summaryCard: {
    gap: 6,
  },
  footerButton: {
    marginTop: 'auto',
  },
});
