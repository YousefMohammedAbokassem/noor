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
import { secureSession } from '@/services/storage';
import { useAuthStore } from '@/state/authStore';
import { buildDeviceMeta } from '@/utils/device';
import { syncService } from '@/services/syncService';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;
type FormValues = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const auth = useAuthStore();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  const schema = useMemo(
    () =>
      z
        .object({
          fullName: z.string().min(2, t('auth.nameShort')),
          email: z.string().email(t('auth.invalidEmail')),
          password: z.string().min(8, t('auth.passwordShort')),
          confirmPassword: z.string().min(8, t('auth.passwordShort')),
        })
        .refine((val) => val.password === val.confirmPassword, {
          path: ['confirmPassword'],
          message: t('auth.passwordMismatch'),
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
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const submit = async (values: FormValues) => {
    setLoading(true);
    setError('');
    try {
      const result = await authApi.register({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        preferredLanguage: auth.language,
        numberFormat: auth.numberFormat,
        device: await buildDeviceMeta(),
      });
      await secureSession.saveTokens(result.tokens);
      auth.login(result.user);
      await syncService.syncNow().catch(() => null);
      navigation.navigate('VerifyEmail', { email: values.email });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppInput
        label={t('auth.fullName')}
        value={watch('fullName')}
        onChangeText={(v) => setValue('fullName', v, { shouldValidate: true })}
        error={errors.fullName?.message}
      />
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
      <AppInput
        label={t('auth.confirmPassword')}
        secureTextEntry
        value={watch('confirmPassword')}
        onChangeText={(v) => setValue('confirmPassword', v, { shouldValidate: true })}
        error={errors.confirmPassword?.message}
      />

      {!!error && <AppText color={theme.colors.neutral.danger}>{error}</AppText>}

      <AppButton title={loading ? t('common.loading') : t('auth.registerTitle')} onPress={handleSubmit(submit)} disabled={loading} />
      <AppButton title={t('auth.hasAccount')} variant="ghost" onPress={() => navigation.replace('Login')} />
    </Screen>
  );
};
