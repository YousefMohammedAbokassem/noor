import React, { useState } from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  const submit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await authApi.forgotPassword(email);
      setSuccess(t('auth.resetSent'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppText variant="bodyMd">{t('auth.forgotHint')}</AppText>

      <AppInput label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" />
      {!!error && <AppText color={theme.colors.neutral.danger}>{error}</AppText>}
      {!!success && <AppText color={theme.colors.neutral.success}>{success}</AppText>}

      <AppButton title={loading ? t('common.loading') : t('auth.sendReset')} onPress={submit} disabled={loading} />
      <AppButton title={t('common.back')} variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
};
