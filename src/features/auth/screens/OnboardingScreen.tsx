import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { useAuthStore } from '@/state/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const auth = useAuthStore();

  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={require('../../../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <AppText variant="headingLg">{t('onboarding.title')}</AppText>
        <AppText variant="bodyMd">{t('onboarding.body')}</AppText>
      </View>
      <AppButton
        title={t('onboarding.guest')}
        variant="ghost"
        onPress={() => {
          auth.continueAsGuest();
          navigation.replace('MainTabs');
        }}
      />
      <AppButton title={t('onboarding.createAccount')} onPress={() => navigation.navigate('Register')} />
      <AppButton title={t('onboarding.login')} variant="secondary" onPress={() => navigation.navigate('Login')} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginTop: 24,
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 72,
    height: 72,
  },
});
