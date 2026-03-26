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

type Props = NativeStackScreenProps<RootStackParamList, 'PrayerLocationRequest'>;

export const PrayerLocationRequestScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  return (
    <Screen showDecorations={false} contentStyle={styles.content}>
      <View style={styles.heroWrap}>
        <View style={[styles.heroCircle, { backgroundColor: theme.colors.neutral.surfaceAlt }]}>
          <Image source={require('../../../../assets/prayer-request.png')} style={styles.heroImage} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.copyWrap}>
        <AppText variant="headingLg" style={styles.centerText}>
          {t('prayer.requestLocation')}
        </AppText>
        <AppText variant="headingSm" style={styles.centerText} color={theme.colors.neutral.textSecondary}>
          {t('prayer.requestLocationHint')}
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton title={t('prayer.useCurrentLocation')} onPress={() => navigation.navigate('PrayerLoading')} />
        <AppButton title={t('common.skip')} variant="ghost" onPress={() => navigation.navigate('ManualCity')} />
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
    marginTop: 16,
  },
  heroCircle: {
    width: 250,
    height: 250,
    borderRadius: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 182,
    height: 182,
  },
  copyWrap: {
    gap: 10,
    marginTop: 10,
  },
  centerText: {
    textAlign: 'center',
  },
  actions: {
    gap: 12,
  },
});
