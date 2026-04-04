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
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

type FormValues = {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
};

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  const schema = useMemo(
    () =>
      z
        .object({
          email: z.string().email(t('auth.invalidEmail')),
          code: z.string().trim().regex(/^\d{6}$/, t('auth.invalidCode')),
          password: z.string().min(8, t('auth.passwordShort')),
          confirmPassword: z.string().min(8, t('auth.passwordShort')),
        })
        .refine((value) => value.password === value.confirmPassword, {
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
    defaultValues: {
      email: route.params?.email ?? '',
      code: '',
      password: '',
      confirmPassword: '',
    },
  });

  const submit = async (values: FormValues) => {
    setLoading(true);
    setError('');

    try {
      await authApi.resetPassword(values.email, values.code, values.password);
      navigation.replace('Login', {
        email: values.email.trim().toLowerCase(),
        successMessage: t('auth.passwordResetSuccess'),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen showDecorations={false} showThemeToggle={false}>
      <AppText variant="bodyMd">{t('auth.resetHint')}</AppText>

      <AppInput
        label={t('auth.email')}
        value={watch('email')}
        onChangeText={(v) => setValue('email', v, { shouldValidate: true })}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.email?.message}
      />
      <AppInput
        label={t('auth.resetCode')}
        value={watch('code')}
        onChangeText={(v) => setValue('code', v, { shouldValidate: true })}
        keyboardType="number-pad"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.code?.message}
      />
      <AppInput
        label={t('auth.newPassword')}
        value={watch('password')}
        onChangeText={(v) => setValue('password', v, { shouldValidate: true })}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.password?.message}
      />
      <AppInput
        label={t('auth.confirmPassword')}
        value={watch('confirmPassword')}
        onChangeText={(v) => setValue('confirmPassword', v, { shouldValidate: true })}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.confirmPassword?.message}
      />

      {!!error && <AppText color={theme.colors.neutral.danger}>{error}</AppText>}

      <AppButton
        title={loading ? t('common.loading') : t('auth.resetNow')}
        onPress={handleSubmit(submit)}
        disabled={loading}
      />
      <AppButton title={t('auth.loginNow')} variant="ghost" onPress={() => navigation.replace('Login')} />
    </Screen>
  );
};
