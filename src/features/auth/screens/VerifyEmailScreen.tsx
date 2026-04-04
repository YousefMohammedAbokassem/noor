import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { authApi } from '@/api/authApi';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export const VerifyEmailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resending, setResending] = useState(false);
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await authApi.verifyEmail(email, code);
      setSuccess(t('auth.verifySuccess'));
      navigation.replace('Login', {
        email: email.trim().toLowerCase(),
        successMessage: t('auth.verifySuccess'),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError('');
    setSuccess('');
    try {
      await authApi.resendVerification(email);
      setSuccess(t('auth.resendSuccess'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen showDecorations={false} showThemeToggle={false}>
      <View style={styles.hero}>
        <Image source={require('../../../../assets/logo-mark.webp')} style={styles.logo} resizeMode="contain" />
      </View>
      <AppText variant="bodyMd">{t('auth.verifyHint')}</AppText>
      <AppInput
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <AppInput
        label={t('auth.verifyCode')}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!!error && <AppText color={theme.colors.neutral.danger}>{error}</AppText>}
      {!!success && <AppText color={theme.colors.neutral.success}>{success}</AppText>}
      <AppButton title={loading ? t('common.loading') : t('common.confirm')} onPress={submit} disabled={loading} />
      <AppButton
        title={resending ? t('common.loading') : t('auth.resendCode')}
        variant="ghost"
        onPress={resend}
        disabled={resending}
      />
      <AppButton title={t('auth.loginNow')} variant="secondary" onPress={() => navigation.replace('Login', { email })} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  logo: {
    width: 88,
    height: 88,
  },
});
