import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { authApi } from '@/api/authApi';
import { ApiClientError } from '@/api/client';
import { useAuthStore } from '@/state/authStore';
import { secureSession } from '@/services/storage';
import { buildDeviceMeta } from '@/utils/device';
import { syncService } from '@/services/syncService';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;
type FormValues = {
  email: string;
  password: string;
};

export const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(route.params?.successMessage ?? '');
  const [blockedEmail, setBlockedEmail] = useState<string | null>(null);
  const auth = useAuthStore();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.invalidEmail')),
        password: z.string().min(8, t('auth.passwordShort')),
      }),
    [t],
  );

  const {
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: route.params?.email ?? '', password: '' },
  });

  const submit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    setSuccess('');
    setBlockedEmail(null);
    try {
      const result = await authApi.login({
        ...values,
        device: await buildDeviceMeta(),
      });
      await secureSession.saveTokens(result.tokens);
      auth.login(result.user);
      await syncService.syncNow().catch(() => null);
      navigation.replace('PermissionGate', { nextRoute: 'MainTabs' });
    } catch (e) {
      const apiError = e as ApiClientError;
      setError(apiError.message);
      if (apiError.code === 'email_not_verified') {
        setBlockedEmail(values.email.trim().toLowerCase());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen showDecorations={false} showThemeToggle={false}>
      <View style={styles.hero}>
        <Image source={require('../../../../assets/logo-mark.webp')} style={styles.logo} resizeMode="contain" />
      </View>
      <AppInput
        label={t('auth.email')}
        keyboardType="email-address"
        value={watch('email')}
        onChangeText={(v) => setValue('email', v, { shouldValidate: true })}
        error={errors.email?.message}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <AppInput
        label={t('auth.password')}
        secureTextEntry
        value={watch('password')}
        onChangeText={(v) => setValue('password', v, { shouldValidate: true })}
        error={errors.password?.message}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {!!error && <AppText color={theme.colors.neutral.danger}>{error}</AppText>}
      {!!success && <AppText color={theme.colors.neutral.success}>{success}</AppText>}

      <AppButton title={loading ? t('common.loading') : t('auth.loginTitle')} onPress={handleSubmit(submit)} disabled={loading} />
      {blockedEmail ? (
        <AppButton
          title={t('auth.goToVerification')}
          variant="secondary"
          onPress={() => navigation.replace('VerifyEmail', { email: blockedEmail })}
        />
      ) : null}
      <AppButton
        title={t('auth.forgotTitle')}
        variant="ghost"
        onPress={() => navigation.navigate('ForgotPassword', { email: watch('email') })}
      />
      <AppButton title={t('auth.registerTitle')} variant="secondary" onPress={() => navigation.navigate('Register')} />
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
    width: 92,
    height: 92,
  },
});
