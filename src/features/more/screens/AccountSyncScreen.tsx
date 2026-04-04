import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/state/authStore';
import { syncService } from '@/services/syncService';

export const AccountSyncScreen: React.FC = () => {
  const { t } = useTranslation();
  const auth = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [syncState, setSyncState] = useState(t('common.notAvailable'));
  const [loading, setLoading] = useState(false);

  const runSync = async () => {
    setLoading(true);
    const result = await syncService.syncNow().catch(() => ({ synced: false }));
    setLoading(false);

    if (result.synced) {
      setSyncState(t('common.success'));
      return;
    }

    setSyncState(t('common.error'));
  };

  return (
    <Screen showDecorations={false} showThemeToggle={false}>
      <AppCard>
        <AppText variant="bodyMd">
          {t('more.accountSync')}: {auth.isAuthenticated ? t('common.done') : t('common.notAvailable')}
        </AppText>
        <AppText variant="bodyMd">{`${t('auth.email')}: ${auth.user?.email ?? '--'}`}</AppText>
        <AppText variant="bodyMd">{`${t('more.accountSync')}: ${syncState}`}</AppText>
      </AppCard>
      <AppButton title={loading ? t('common.loading') : t('more.accountSync')} onPress={runSync} disabled={loading || !auth.isAuthenticated} />
      {!auth.isAuthenticated ? (
        <>
          <AppText variant="bodySm" style={{ textAlign: 'center' }}>
            {t('more.guestModeHint')}
          </AppText>
          <AppButton title={t('auth.loginTitle')} onPress={() => navigation.navigate('Login')} />
          <AppButton title={t('auth.registerTitle')} variant="secondary" onPress={() => navigation.navigate('Register')} />
        </>
      ) : null}
    </Screen>
  );
};
