import React from 'react';
import { View } from 'react-native';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';

export const EmptyState: React.FC<{ title: string; description?: string }> = ({ title, description }) => {
  return (
    <AppCard style={{ padding: 20 }}>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <AppText variant="headingSm">{title}</AppText>
        {!!description && (
          <AppText variant="bodySm" style={{ textAlign: 'center' }}>
            {description}
          </AppText>
        )}
      </View>
    </AppCard>
  );
};
