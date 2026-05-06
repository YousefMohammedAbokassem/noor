import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { useAppAlert } from '@/components/ui/AppAlertProvider';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { notificationService } from '@/services/notificationService';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';
import { parseClockTime, shiftClockTime } from '@/utils/time';
import { getThemeByMode } from '@/theme';

const toClockTimeDate = (value: string) => {
  const parsed = parseClockTime(value) ?? { hour: 0, minute: 0 };
  const nextDate = new Date();
  nextDate.setHours(parsed.hour, parsed.minute, 0, 0);
  return nextDate;
};

const toClockTimeValue = (value: Date) =>
  `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

export const RemindersScreen: React.FC = () => {
  const { t } = useTranslation();
  const { showAlert } = useAppAlert();
  const reminders = useSettingsStore((s) => s.reminders);
  const dhikrLoopSettings = useSettingsStore((s) => s.dhikrLoopSettings);
  const prayerSettings = useSettingsStore((s) => s.prayerSettings);
  const upsert = useSettingsStore((s) => s.upsertReminder);
  const setDhikrLoopSettings = useSettingsStore((s) => s.setDhikrLoopSettings);
  const language = useAuthStore((s) => s.language);
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';
  const [activeReminderPickerId, setActiveReminderPickerId] = useState<string | null>(null);
  const [pickerTime, setPickerTime] = useState(() => toClockTimeDate(reminders[0]?.time ?? '08:00'));
  const skipFirstAutoSyncRef = useRef(true);
  const skipNextAutoSyncRef = useRef(false);

  const labels: Record<string, string> = {
    wird: t('reminders.wird'),
    daily_wird: t('reminders.dailyWird'),
    morning_adhkar: t('reminders.morning'),
    evening_adhkar: t('reminders.evening'),
    mulk: t('reminders.mulk'),
    kahf: t('reminders.kahf'),
    baqarah: t('reminders.baqarah'),
  };

  const tweakTime = (id: string, fallbackTime: string, deltaMinutes: number) => {
    const shifted = shiftClockTime(fallbackTime, deltaMinutes);
    if (!shifted) {
      return;
    }

    upsert(id, { time: shifted });
  };

  const showReminderSyncFailure = useCallback(
    async () => {
      const snapshot = await notificationService.getPermissionSnapshot();
      const message = snapshot.granted ? t('reminders.scheduleHint') : t('reminders.permissionHint');
      const actions =
        !snapshot.granted && snapshot.canAskAgain === false
          ? [
              { text: t('common.cancel'), style: 'cancel' as const },
              { text: t('common.openSettings'), onPress: () => Linking.openSettings() },
            ]
          : [{ text: t('common.done') }];

      showAlert(t('reminders.title'), `${t('reminders.syncFailed')}\n${message}`, actions);
    },
    [showAlert, t],
  );

  const openReminderTimePicker = useCallback((id: string, time: string) => {
    setPickerTime(toClockTimeDate(time));
    setActiveReminderPickerId(id);
  }, []);

  const closeReminderTimePicker = useCallback(() => {
    setActiveReminderPickerId(null);
  }, []);

  const handleAndroidReminderPickerChange = useCallback(
    (event: { type?: string }, nextValue?: Date) => {
      if (!activeReminderPickerId) {
        return;
      }

      if (event.type === 'dismissed') {
        closeReminderTimePicker();
        return;
      }

      const chosenValue = nextValue ?? pickerTime;
      setPickerTime(chosenValue);
      upsert(activeReminderPickerId, { time: toClockTimeValue(chosenValue) });
      closeReminderTimePicker();
    },
    [activeReminderPickerId, closeReminderTimePicker, pickerTime, upsert],
  );

  const confirmReminderTime = useCallback(() => {
    if (!activeReminderPickerId) return;
    upsert(activeReminderPickerId, { time: toClockTimeValue(pickerTime) });
    closeReminderTimePicker();
  }, [activeReminderPickerId, closeReminderTimePicker, pickerTime, upsert]);

  const syncReminderChanges = useCallback(async (nextReminders = reminders) => {
    const hasPermission = await notificationService.getPermissionStatus();
    if (!hasPermission) {
      const granted = await notificationService.requestPermission();
      if (!granted) {
        await showReminderSyncFailure();
        return false;
      }
    }

    const ok = await notificationService.syncSupplementalNotifications({
      reminders: nextReminders,
      dhikrLoopSettings,
      lang: language,
    });

    if (!ok) {
      await showReminderSyncFailure();
      return false;
    }

    await prayerRuntime.requestRepair('reminders_changed', {
      allowLocationRefresh: prayerSettings.locationMode !== 'manual',
      forceNotificationResync: false,
    });
    return true;
  }, [dhikrLoopSettings, language, prayerSettings.locationMode, reminders, showReminderSyncFailure]);

  useEffect(() => {
    if (skipFirstAutoSyncRef.current) {
      skipFirstAutoSyncRef.current = false;
      return;
    }

    if (skipNextAutoSyncRef.current) {
      skipNextAutoSyncRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      void syncReminderChanges(reminders);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [reminders, syncReminderChanges]);

  const toggleReminder = async (id: string, enabled: boolean) => {
    const currentReminder = reminders.find((item) => item.id === id);
    if (!currentReminder) return;

    const nextReminders = reminders.map((item) =>
      item.id === id ? { ...item, enabled } : item,
    );

    skipNextAutoSyncRef.current = true;
    upsert(id, { enabled });
    const ok = await syncReminderChanges(nextReminders);
    if (!ok) {
      skipNextAutoSyncRef.current = true;
      upsert(id, { enabled: currentReminder.enabled });
    }
  };

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
      await showReminderSyncFailure();
    }
  };

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      {reminders.map((item) => (
        <AppCard key={item.id} style={styles.reminderCard}>
          <SwitchRow
            label={labels[item.id] ?? item.type}
            value={item.enabled}
            onValueChange={(value) => {
              void toggleReminder(item.id, value);
            }}
            description={`${t('common.today')}: ${item.time}`}
          />
          <Pressable
            onPress={() => openReminderTimePicker(item.id, item.time)}
            style={({ pressed }) => [
              styles.timePickerRow,
              isRTL && styles.rowReverse,
              {
                borderColor: theme.colors.neutral.borderStrong,
                backgroundColor: theme.colors.neutral.backgroundElevated,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={[styles.timePickerCopy, isRTL && styles.textWrapRtl]}>
              <AppText variant="bodyLg">{t('reminders.timeField')}</AppText>
            </View>
            <View
              style={[
                styles.timeChip,
                isRTL && styles.rowReverse,
                {
                  backgroundColor: isDark ? theme.colors.neutral.surface : theme.colors.brand.mist,
                },
              ]}
            >
              <Ionicons name="time-outline" size={16} color={theme.colors.brand.softGold} />
              <AppText variant="headingSm" direction="ltr">
                {item.time}
              </AppText>
            </View>
          </Pressable>
          <View style={[styles.row, isRTL && styles.rowReverse]}>
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
        <View style={[styles.row, isRTL && styles.rowReverse]}>
          <AppButton title="- 5" variant="ghost" onPress={() => tweakDhikrLoopInterval(-5)} style={{ flex: 1 }} />
          <AppButton title="+ 5" variant="ghost" onPress={() => tweakDhikrLoopInterval(5)} style={{ flex: 1 }} />
        </View>
      </AppCard>

      {Platform.OS === 'ios' ? (
        <Modal visible={activeReminderPickerId !== null} transparent animationType="fade" onRequestClose={closeReminderTimePicker}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={closeReminderTimePicker} />
            <View
              style={[
                styles.timePickerSheet,
                {
                  backgroundColor: theme.colors.neutral.surface,
                  borderColor: theme.colors.neutral.borderStrong,
                },
              ]}
            >
              <View style={[styles.timePickerHeader, isRTL && styles.rowReverse]}>
                <AppText variant="headingSm">{t('reminders.timeField')}</AppText>
                <Pressable
                  onPress={confirmReminderTime}
                  style={({ pressed }) => [
                    styles.timePickerConfirm,
                    {
                      backgroundColor: theme.colors.brand.lightGreen,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color={theme.colors.brand.darkGreen} />
                </Pressable>
              </View>
              <DateTimePicker
                value={pickerTime}
                mode="time"
                display="spinner"
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={(_, nextValue) => {
                  if (nextValue) {
                    setPickerTime(nextValue);
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : activeReminderPickerId ? (
        <DateTimePicker
          value={pickerTime}
          mode="time"
          display="clock"
          onChange={(event, nextValue) => {
            handleAndroidReminderPickerChange(event, nextValue);
          }}
        />
      ) : null}
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
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  timePickerRow: {
    minHeight: 60,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 10,
  },
  timePickerCopy: {
    flex: 1,
    gap: 2,
  },
  textWrapRtl: {
    alignItems: 'flex-end',
  },
  timeChip: {
    minWidth: 98,
    minHeight: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.36)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  timePickerSheet: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  timePickerConfirm: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
