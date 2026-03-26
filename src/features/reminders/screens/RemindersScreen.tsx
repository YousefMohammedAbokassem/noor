import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { notificationService } from '@/services/notificationService';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';
import { normalizeClockTimeInput, shiftClockTime } from '@/utils/time';

export const RemindersScreen: React.FC = () => {
  const { t } = useTranslation();
  const reminders = useSettingsStore((s) => s.reminders);
  const dhikrLoopSettings = useSettingsStore((s) => s.dhikrLoopSettings);
  const prayerSettings = useSettingsStore((s) => s.prayerSettings);
  const upsert = useSettingsStore((s) => s.upsertReminder);
  const setDhikrLoopSettings = useSettingsStore((s) => s.setDhikrLoopSettings);
  const language = useAuthStore((s) => s.language);
  const [timeDrafts, setTimeDrafts] = useState<Record<string, string>>(
    () => Object.fromEntries(reminders.map((item) => [item.id, item.time])),
  );
  const [timeErrors, setTimeErrors] = useState<Record<string, string | undefined>>({});
  const skipFirstAutoSyncRef = useRef(true);

  useEffect(() => {
    setTimeDrafts((current) => ({
      ...current,
      ...Object.fromEntries(reminders.map((item) => [item.id, item.time])),
    }));
  }, [reminders]);

  const labels: Record<string, string> = {
    wird: t('reminders.wird'),
    morning_adhkar: t('reminders.morning'),
    evening_adhkar: t('reminders.evening'),
    mulk: t('reminders.mulk'),
    kahf: t('reminders.kahf'),
    baqarah: t('reminders.baqarah'),
  };

  const setDraftError = (id: string, error?: string) => {
    setTimeErrors((current) => ({
      ...current,
      [id]: error,
    }));
  };

  const commitReminderTime = (id: string) => {
    const normalized = normalizeClockTimeInput(timeDrafts[id] ?? '');
    if (!normalized) {
      setDraftError(id, t('reminders.invalidTime'));
      return null;
    }

    setTimeDrafts((current) => ({
      ...current,
      [id]: normalized,
    }));
    setDraftError(id, undefined);
    upsert(id, { time: normalized });
    return normalized;
  };

  const tweakTime = (id: string, fallbackTime: string, deltaMinutes: number) => {
    const shifted = shiftClockTime(timeDrafts[id] ?? fallbackTime, deltaMinutes);
    if (!shifted) {
      setDraftError(id, t('reminders.invalidTime'));
      return;
    }

    setTimeDrafts((current) => ({
      ...current,
      [id]: shifted,
    }));
    setDraftError(id, undefined);
    upsert(id, { time: shifted });
  };

  const syncReminderChanges = useCallback(async (nextReminders = reminders) => {
    const hasPermission = await notificationService.getPermissionStatus();
    if (!hasPermission) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        Alert.alert(t('reminders.title'), `${t('reminders.syncFailed')}\n${t('reminders.permissionHint')}`);
        return false;
      }
    }

    const ok = await notificationService.syncSupplementalNotifications({
      reminders: nextReminders,
      dhikrLoopSettings,
      lang: language,
    });

    if (!ok) {
      Alert.alert(t('reminders.title'), `${t('reminders.syncFailed')}\n${t('reminders.permissionHint')}`);
      return false;
    }

    await prayerRuntime.requestRepair('reminders_changed', {
      allowLocationRefresh: prayerSettings.locationMode !== 'manual',
      forceNotificationResync: false,
    });
    return true;
  }, [dhikrLoopSettings, language, prayerSettings.locationMode, reminders, t]);

  useEffect(() => {
    if (skipFirstAutoSyncRef.current) {
      skipFirstAutoSyncRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      void syncReminderChanges(reminders);
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [reminders, syncReminderChanges]);

  const tweakDhikrLoopInterval = (deltaMinutes: number) => {
    const nextInterval = Math.min(180, Math.max(5, dhikrLoopSettings.intervalMinutes + deltaMinutes));
    setDhikrLoopSettings({ intervalMinutes: nextInterval });

    if (dhikrLoopSettings.enabled) {
      void notificationService.syncDhikrLoopNotifications(
        { enabled: true, intervalMinutes: nextInterval },
        language,
      );
    }
  };

  const toggleDhikrLoop = async (value: boolean) => {
    const previousValue = dhikrLoopSettings.enabled;
    setDhikrLoopSettings({ enabled: value });
    const ok = await notificationService.syncDhikrLoopNotifications(
      { enabled: value, intervalMinutes: dhikrLoopSettings.intervalMinutes },
      language,
      { sendImmediateNow: value },
    );

    if (!ok) {
      setDhikrLoopSettings({ enabled: previousValue });
      Alert.alert(t('reminders.title'), `${t('reminders.syncFailed')}\n${t('reminders.permissionHint')}`);
    }
  };

  return (
    <Screen showDecorations={false} contentStyle={styles.content}>
      {reminders.map((item) => (
        <AppCard key={item.id} style={styles.reminderCard}>
          <SwitchRow
            label={labels[item.id] ?? item.type}
            value={item.enabled}
            onValueChange={(value) => upsert(item.id, { enabled: value })}
            description={`${t('common.today')}: ${timeDrafts[item.id] ?? item.time}`}
          />
          <AppInput
            label={t('reminders.timeField')}
            value={timeDrafts[item.id] ?? item.time}
            onChangeText={(value) =>
              setTimeDrafts((current) => ({
                ...current,
                [item.id]: value,
              }))
            }
            onBlur={() => {
              commitReminderTime(item.id);
            }}
            onSubmitEditing={() => {
              commitReminderTime(item.id);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="HH:mm"
            error={timeErrors[item.id]}
          />
          <View style={styles.row}>
            <AppButton title="- 15" variant="ghost" onPress={() => tweakTime(item.id, item.time, -15)} style={{ flex: 1 }} />
            <AppButton title="+ 15" variant="ghost" onPress={() => tweakTime(item.id, item.time, 15)} style={{ flex: 1 }} />
          </View>
        </AppCard>
      ))}

      <AppCard style={styles.reminderCard}>
        <SwitchRow
          label={t('reminders.dhikrLoop')}
          value={dhikrLoopSettings.enabled}
          onValueChange={toggleDhikrLoop}
          description={t('reminders.dhikrLoopHint', { minutes: dhikrLoopSettings.intervalMinutes })}
        />
        <View style={styles.row}>
          <AppButton title="- 5" variant="ghost" onPress={() => tweakDhikrLoopInterval(-5)} style={{ flex: 1 }} />
          <AppButton title="+ 5" variant="ghost" onPress={() => tweakDhikrLoopInterval(5)} style={{ flex: 1 }} />
        </View>
      </AppCard>

    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  reminderCard: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});
