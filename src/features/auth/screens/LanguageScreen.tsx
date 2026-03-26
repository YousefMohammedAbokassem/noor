import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { useAuthStore } from '@/state/authStore';
import { setLanguage } from '@/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;

export const LanguageScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const auth = useAuthStore();

  const chooseLanguage = async (lang: 'ar' | 'en') => {
    try {
      auth.setLanguage(lang);
      await setLanguage(lang);
    } catch (error) {
      if (__DEV__) {
        console.error('[language] failed to switch language', error);
      }
    }
  };

  return (
    <Screen showDecorations={false} contentStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={require('../../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <AppText variant="headingLg" style={{ textAlign: 'center' }}>
          {t('language.title')}
        </AppText>
        <AppText variant="bodyMd" style={{ textAlign: 'center' }}>
          {t('language.description')}
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton title={t('language.arabic')} onPress={() => chooseLanguage('ar')} style={{ flex: 1 }} />
        <AppButton title={t('language.english')} variant="secondary" onPress={() => chooseLanguage('en')} style={{ flex: 1 }} />
      </View>

      <View style={styles.actions}>
        <AppButton
          title={t('language.numbersArabic')}
          variant="ghost"
          onPress={() => auth.setNumberFormat('arabic')}
          style={{ flex: 1 }}
        />
        <AppButton
          title={t('language.numbersEnglish')}
          variant="ghost"
          onPress={() => auth.setNumberFormat('english')}
          style={{ flex: 1 }}
        />
      </View>

      <AppButton
        title={t('common.continue')}
        onPress={() => {
          auth.completeOnboarding();
          if (auth.isAuthenticated || auth.isGuest) {
            navigation.replace('MainTabs');
            return;
          }
          navigation.replace('Onboarding');
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 28,
  },
  hero: {
    alignItems: 'center',
    gap: 14,
  },
  logo: {
    width: 152,
    height: 82,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
});
