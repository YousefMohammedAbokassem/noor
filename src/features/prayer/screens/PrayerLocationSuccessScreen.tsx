import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'PrayerLocationSuccess'>;

export const PrayerLocationSuccessScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const prayerSettings = useSettingsStore((s) => s.prayerSettings);
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const city = prayerSettings.city || prayerSettings.country || t('prayer.noCity');

  return (
    <Screen showDecorations={false} contentStyle={styles.content}>
      <View style={styles.heroWrap}>
        <View style={[styles.heroCircle, { backgroundColor: theme.colors.neutral.surfaceAlt }]}>
          <Image source={require('../../../../assets/prayer-success.png')} style={styles.heroImage} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.copyWrap}>
        <AppText variant="headingLg" style={styles.centerText}>
          {t('prayer.success')}
        </AppText>
        <AppText variant="headingSm" style={styles.centerText} color={theme.colors.neutral.success}>
          {city}
        </AppText>
        <View style={[styles.divider, { backgroundColor: theme.colors.neutral.border }]} />
        <AppText variant="bodyMd" style={styles.centerText} color={theme.colors.neutral.textSecondary}>
          {t('prayer.changeLocationLater')}
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton title={t('common.continue')} onPress={() => navigation.replace('MainTabs')} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  heroWrap: {
    alignItems: 'center',
    marginTop: 10,
  },
  heroCircle: {
    width: 250,
    height: 250,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 176,
    height: 176,
  },
  copyWrap: {
    gap: 8,
  },
  centerText: {
    textAlign: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  actions: {
    gap: 10,
  },
});
