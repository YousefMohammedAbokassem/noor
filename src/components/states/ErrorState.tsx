import React from 'react';
import { View } from 'react-native';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppText } from '@/components/ui/AppText';
import i18n from '@/i18n';

export const ErrorState: React.FC<{ title: string; onRetry?: () => void; description?: string }> = ({
  title,
  onRetry,
  description,
}) => {
  return (
    <AppCard style={{ padding: 20 }}>
      <View style={{ gap: 10, alignItems: 'center' }}>
        <AppText variant="headingSm">{title}</AppText>
        {!!description && (
          <AppText variant="bodySm" style={{ textAlign: 'center' }}>
            {description}
          </AppText>
        )}
        {!!onRetry && <AppButton title={i18n.t('common.tryAgain')} onPress={onRetry} />}
      </View>
    </AppCard>
  );
};
