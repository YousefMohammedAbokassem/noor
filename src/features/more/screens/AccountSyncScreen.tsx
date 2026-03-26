import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { useAuthStore } from '@/state/authStore';
import { syncService } from '@/services/syncService';

export const AccountSyncScreen: React.FC = () => {
  const { t } = useTranslation();
  const auth = useAuthStore();
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
    <Screen showDecorations={false}>
      <AppCard>
        <AppText variant="bodyMd">
          {t('more.accountSync')}: {auth.isAuthenticated ? t('common.done') : t('common.notAvailable')}
        </AppText>
        <AppText variant="bodyMd">{`${t('auth.email')}: ${auth.user?.email ?? '--'}`}</AppText>
        <AppText variant="bodyMd">{`${t('more.accountSync')}: ${syncState}`}</AppText>
      </AppCard>
      <AppButton title={loading ? t('common.loading') : t('more.accountSync')} onPress={runSync} disabled={loading} />
      {!auth.isAuthenticated && (
        <AppText variant="bodySm" style={{ textAlign: 'center' }}>
          {t('auth.noAccount')}
        </AppText>
      )}
    </Screen>
  );
};
