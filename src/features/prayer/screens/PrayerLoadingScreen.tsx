import React, { useEffect } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';

type Props = NativeStackScreenProps<RootStackParamList, 'PrayerLoading'>;

export const PrayerLoadingScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  useEffect(() => {
    const run = async () => {
      try {
        await prayerRuntime.refreshAutoLocation();
        navigation.replace('PrayerLocationSuccess');
      } catch {
        navigation.replace('LocationFailure');
      }
    };

    void run();
  }, [navigation]);

  return (
    <Screen showDecorations={false} scroll={false} contentStyle={styles.content}>
      <View style={[styles.heroCircle, { backgroundColor: theme.colors.neutral.surfaceAlt }]}>
        <Image source={require('../../../../assets/prayer-request.png')} style={styles.heroImage} resizeMode="contain" />
      </View>
      <ActivityIndicator size="large" color={theme.colors.brand.lightGreen} />
      <AppText variant="headingSm" style={styles.centerText}>
        {t('prayer.loading')}
      </AppText>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 40,
  },
  heroCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 152,
    height: 152,
    opacity: 0.92,
  },
  centerText: {
    textAlign: 'center',
  },
});
