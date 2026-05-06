import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { supportedCities } from '@/constants/cities';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';

type Props = NativeStackScreenProps<RootStackParamList, 'ManualCity'>;

export const ManualCityScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const setPrayerSettings = useSettingsStore((s) => s.setPrayerSettings);
  const prayerSettings = useSettingsStore((s) => s.prayerSettings);
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const language = useAuthStore((s) => s.language);
  const isRTL = language === 'ar';

  return (
    <Screen scroll={false} showDecorations={false} showThemeToggle={false}>
      <FlatList
        data={supportedCities}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <AppButton
            title={t('prayer.useCurrentLocation')}
            onPress={() => {
              setPrayerSettings({ locationMode: 'auto' });
              navigation.navigate('PrayerLoading');
            }}
            style={styles.gpsButton}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={async () => {
              const cityName = language === 'ar' ? item.cityAr : item.cityEn;
              const countryName = language === 'ar' ? item.countryAr : item.countryEn;

              setPrayerSettings({
                locationMode: 'manual',
                city: cityName,
                country: countryName,
                countryCode: item.countryCode,
                latitude: item.lat,
                longitude: item.lng,
                timeZone: item.timeZone,
                locationLabel: cityName,
                locationSource: 'manual_preset',
                presetCityId: item.id,
                calculationMethod: item.calculationMethod ?? prayerSettings.calculationMethod,
                asrMethod: item.asrMethod ?? prayerSettings.asrMethod,
                locationUpdatedAt: new Date().toISOString(),
              });

              await prayerRuntime.requestRepair('manual_location_changed', {
                allowLocationRefresh: false,
                forceNotificationResync: true,
              });

              if (navigation.canGoBack()) {
                navigation.goBack();
                return;
              }
              navigation.replace('MainTabs');
            }}
          >
            <AppCard style={[styles.card, isRTL && styles.rowReverse]}>
              <View style={[styles.textWrap, isRTL && styles.textWrapRtl]}>
                <AppText variant="headingSm">{language === 'ar' ? item.cityAr : item.cityEn}</AppText>
                <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                  {language === 'ar' ? item.countryAr : item.countryEn}
                </AppText>
              </View>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={theme.colors.neutral.textSecondary}
              />
            </AppCard>
          </Pressable>
        )}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textWrap: {
    gap: 2,
  },
  textWrapRtl: {
    alignItems: 'flex-end',
  },
  gpsButton: {
    marginBottom: 12,
  },
});
