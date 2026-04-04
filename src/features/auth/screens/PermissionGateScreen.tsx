import React from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { InlineBackThemeBar } from '@/components/ui/InlineBackThemeBar';
import { RootStackParamList } from '@/navigation/types';
import { goBackSmart } from '@/navigation/goBackSmart';
import { notificationService } from '@/services/notificationService';
import { locationService } from '@/services/locationService';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';

type Props = NativeStackScreenProps<RootStackParamList, 'PermissionGate'>;

export const PermissionGateScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const setPrayerSettings = useSettingsStore((s) => s.setPrayerSettings);
  const theme = getThemeByMode(mode);
  const [notificationGranted, setNotificationGranted] = React.useState(false);
  const [locationGranted, setLocationGranted] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);
  const [isRequesting, setIsRequesting] = React.useState(false);
  const allGranted = notificationGranted && locationGranted;

  const refreshStatus = React.useCallback(async () => {
    try {
      const [notifGranted, locGranted] = await Promise.all([
        notificationService.getPermissionStatus(),
        locationService.getPermissionStatus(),
      ]);
      setNotificationGranted(notifGranted);
      setLocationGranted(locGranted);
    } catch {
      setNotificationGranted(false);
      setLocationGranted(false);
    } finally {
      setIsChecking(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshStatus();
      }
    });
    return () => subscription.remove();
  }, [refreshStatus]);

  React.useEffect(() => {
    if (!allGranted) return;
    setPrayerSettings({ locationMode: 'auto' });
    void prayerRuntime.requestRepair('permission_gate_granted', {
      allowLocationRefresh: true,
      forceNotificationResync: true,
    });
    navigation.replace(route.params.nextRoute);
  }, [allGranted, navigation, route.params.nextRoute, setPrayerSettings]);

  const handleGrantAll = React.useCallback(async () => {
    if (isRequesting) return;
    setIsRequesting(true);
    try {
      const notifResult = notificationGranted ? true : await notificationService.requestPermission();
      const locationResult = locationGranted ? true : await locationService.requestPermission();
      setNotificationGranted(notifResult || notificationGranted);
      setLocationGranted(locationResult || locationGranted);
    } finally {
      setIsRequesting(false);
      void refreshStatus();
    }
  }, [isRequesting, locationGranted, notificationGranted, refreshStatus]);

  const handleBack = React.useCallback(() => {
    const didGoBack = goBackSmart(navigation as unknown as Parameters<typeof goBackSmart>[0]);
    if (didGoBack) {
      return;
    }

    navigation.navigate(route.params.nextRoute);
  }, [navigation, route.params.nextRoute]);

  return (
    <Screen scroll={false} showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      <InlineBackThemeBar onBack={handleBack} />

      <View style={styles.header}>
        <AppText variant="headingLg" style={styles.center}>
          {t('permissionsGate.title')}
        </AppText>
        <AppText variant="bodyMd" style={styles.center} color={theme.colors.neutral.textSecondary}>
          {t('permissionsGate.subtitle')}
        </AppText>
      </View>

      <View style={styles.statusCards}>
        <View style={[styles.card, { borderColor: theme.colors.neutral.border }]}>
          <View
            style={[
              styles.dot,
              { backgroundColor: notificationGranted ? theme.colors.neutral.success : theme.colors.neutral.warning },
            ]}
          />
          <View style={styles.cardCopy}>
            <AppText variant="headingSm">{t('permissionsGate.notificationLabel')}</AppText>
            <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
              {notificationGranted ? t('permissionsGate.granted') : t('permissionsGate.required')}
            </AppText>
          </View>
        </View>

        <View style={[styles.card, { borderColor: theme.colors.neutral.border }]}>
          <View
            style={[
              styles.dot,
              { backgroundColor: locationGranted ? theme.colors.neutral.success : theme.colors.neutral.warning },
            ]}
          />
          <View style={styles.cardCopy}>
            <AppText variant="headingSm">{t('permissionsGate.locationLabel')}</AppText>
            <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
              {locationGranted ? t('permissionsGate.granted') : t('permissionsGate.required')}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <AppButton
          title={isRequesting || isChecking ? t('common.loading') : t('permissionsGate.grantAll')}
          onPress={handleGrantAll}
          disabled={isRequesting || isChecking}
        />
        <AppButton
          title={t('permissionsGate.openSettings')}
          variant="ghost"
          onPress={() => {
            void Linking.openSettings();
          }}
        />
        {!allGranted && !isChecking && (
          <AppText variant="bodySm" style={styles.center} color={theme.colors.neutral.textSecondary}>
            {t('permissionsGate.blockedHint')}
          </AppText>
        )}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingVertical: 24,
  },
  header: {
    gap: 10,
  },
  center: {
    textAlign: 'center',
  },
  statusCards: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  cardCopy: {
    gap: 4,
    flex: 1,
  },
  actions: {
    gap: 12,
  },
});
