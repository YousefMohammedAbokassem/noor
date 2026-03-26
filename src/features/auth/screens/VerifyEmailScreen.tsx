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

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export const VerifyEmailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      await authApi.verifyEmail(email, code);
      setSuccess(t('auth.verifySuccess'));
      navigation.replace('MainTabs');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppInput label={t('auth.email')} value={email} onChangeText={setEmail} keyboardType="email-address" />
      <AppInput label={t('auth.verifyCode')} value={code} onChangeText={setCode} keyboardType="number-pad" />
      {!!error && <AppText color={theme.colors.neutral.danger}>{error}</AppText>}
      {!!success && <AppText color={theme.colors.neutral.success}>{success}</AppText>}
      <AppButton title={loading ? t('common.loading') : t('common.confirm')} onPress={submit} disabled={loading} />
      <AppButton title={t('common.skip')} variant="ghost" onPress={() => navigation.replace('MainTabs')} />
    </Screen>
  );
};
