import React, { useMemo, useState } from 'react';
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

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    defaultValues: { email: '', password: '' },
  });

  const submit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    try {
      const result = await authApi.login({
        ...values,
        device: await buildDeviceMeta(),
      });
      await secureSession.saveTokens(result.tokens);
      auth.login(result.user);
      await syncService.syncNow().catch(() => null);
      navigation.replace('MainTabs');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppInput
        label={t('auth.email')}
        keyboardType="email-address"
        value={watch('email')}
        onChangeText={(v) => setValue('email', v, { shouldValidate: true })}
        error={errors.email?.message}
      />
      <AppInput
        label={t('auth.password')}
        secureTextEntry
        value={watch('password')}
        onChangeText={(v) => setValue('password', v, { shouldValidate: true })}
        error={errors.password?.message}
      />

      {!!error && <AppText color={theme.colors.neutral.danger}>{error}</AppText>}

      <AppButton title={loading ? t('common.loading') : t('auth.loginTitle')} onPress={handleSubmit(submit)} disabled={loading} />
      <AppButton title={t('auth.forgotTitle')} variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} />
      <AppButton title={t('auth.registerTitle')} variant="secondary" onPress={() => navigation.navigate('Register')} />
    </Screen>
  );
};
