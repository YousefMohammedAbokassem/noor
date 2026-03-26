import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '@/navigation/types';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RatingExperience'>;

export const RatingExperienceScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const close = () => navigation.goBack();

  const setMeta = async (data: Record<string, unknown>) => {
    const raw = await AsyncStorage.getItem('noor.rating.meta');
    const current = raw ? JSON.parse(raw) : {};
    await AsyncStorage.setItem('noor.rating.meta', JSON.stringify({ ...current, ...data }));
  };

  const rateNow = async () => {
    await setMeta({ dismissed: true, lastPromptAt: new Date().toISOString() });
    const url = Platform.OS === 'ios' ? 'https://apps.apple.com/' : 'https://play.google.com/store/apps';
    await Linking.openURL(url).catch(() => null);
    close();
  };

  return (
    <Pressable style={styles.overlay} onPress={close}>
      <Pressable
        style={[
          styles.card,
          {
            borderColor: theme.colors.neutral.borderStrong,
            backgroundColor: theme.colors.neutral.surface,
          },
        ]}
        onPress={() => null}
      >
        <AppText variant="headingSm" style={styles.centerText}>
          {t('rating.title')}
        </AppText>
        <AppText variant="bodyMd" style={styles.centerText} color={theme.colors.neutral.textSecondary}>
          {t('support.subtitle')}
        </AppText>
        <View style={styles.actionWrap}>
          <AppButton title={t('rating.rateNow')} onPress={rateNow} />
          <AppButton
            title={t('rating.later')}
            variant="secondary"
            onPress={async () => {
              await setMeta({ launchCount: 0, lastPromptAt: new Date().toISOString() });
              close();
            }}
          />
          <AppButton
            title={t('rating.noThanks')}
            variant="ghost"
            onPress={async () => {
              await setMeta({ dismissed: true, lastPromptAt: new Date().toISOString() });
              close();
            }}
          />
        </View>
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  centerText: {
    textAlign: 'center',
  },
  actionWrap: {
    gap: 8,
  },
});
