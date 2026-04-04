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
import { useAuthStore } from '@/state/authStore';
import { buildDeviceMeta } from '@/utils/device';
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
      await authApi.register({
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        preferredLanguage: auth.language,
        numberFormat: auth.numberFormat,
        device: await buildDeviceMeta(),
      });
      navigation.replace('VerifyEmail', { email: values.email.trim() });
    } catch (e) {
      setError((e as Error).message);
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
        label={t('auth.fullName')}
        value={watch('fullName')}
        onChangeText={(v) => setValue('fullName', v, { shouldValidate: true })}
        error={errors.fullName?.message}
        autoCapitalize="words"
      />
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
      <AppInput
        label={t('auth.confirmPassword')}
        secureTextEntry
        value={watch('confirmPassword')}
        onChangeText={(v) => setValue('confirmPassword', v, { shouldValidate: true })}
        error={errors.confirmPassword?.message}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {!!error && <AppText color={theme.colors.neutral.danger}>{error}</AppText>}

      <AppButton title={loading ? t('common.loading') : t('auth.registerTitle')} onPress={handleSubmit(submit)} disabled={loading} />
      <AppButton title={t('auth.hasAccount')} variant="ghost" onPress={() => navigation.replace('Login')} />
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
