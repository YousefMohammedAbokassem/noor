import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { useAppAlert } from '@/components/ui/AppAlertProvider';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { useSettingsStore } from '@/state/settingsStore';
import { usePrayerStore } from '@/state/prayerStore';
import { useAuthStore } from '@/state/authStore';
import { adhanVoiceOptions, normalizeAdhanVoiceId } from '@/constants/adhan';
import { notificationService } from '@/services/notificationService';
import { adhanAudioService } from '@/services/adhanAudioService';
import { exactAlarmService } from '@/services/exactAlarmService';
import { getThemeByMode } from '@/theme';
import { AdhanPrayerName, PrayerNotificationMode, PrayerSettings } from '@/types/models';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';
import { buildManualPrayerTimesSeed, updateManualPrayerTime } from '@/services/prayer/manualTimes';
import { parseClockTime } from '@/utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'PrayerSettings'>;
const PREVIEW_DURATION_MS = 22_000;
const notificationModes: Array<{ key: PrayerNotificationMode; labelKey: string }> = [
  { key: 'adhan_sound', labelKey: 'prayer.notificationModes.adhanSound' },
  { key: 'default_sound', labelKey: 'prayer.notificationModes.defaultSound' },
  { key: 'silent', labelKey: 'prayer.notificationModes.silent' },
];
const calculationOptions = [
  { key: 'umm_al_qura', labelKey: 'prayer.methods.ummAlQura' },
  { key: 'muslim_world_league', labelKey: 'prayer.methods.mwl' },
  { key: 'egyptian', labelKey: 'prayer.methods.egyptian' },
  { key: 'karachi', labelKey: 'prayer.methods.karachi' },
  { key: 'moonsighting_committee', labelKey: 'prayer.methods.moonsighting' },
  { key: 'turkey', labelKey: 'prayer.methods.turkey' },
] as const;
const highLatitudeOptions = [
  { key: 'recommended', labelKey: 'prayer.highLatitudeRules.recommended' },
  { key: 'middle_of_the_night', labelKey: 'prayer.highLatitudeRules.middle' },
  { key: 'seventh_of_the_night', labelKey: 'prayer.highLatitudeRules.seventh' },
  { key: 'twilight_angle', labelKey: 'prayer.highLatitudeRules.angle' },
] as const;
const notificationPrayerKeys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const toClockTimeDate = (value: string) => {
  const parsed = parseClockTime(value) ?? { hour: 0, minute: 0 };
  const nextDate = new Date();
  nextDate.setHours(parsed.hour, parsed.minute, 0, 0);
  return nextDate;
};

const toClockTimeValue = (value: Date) =>
  `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

const buildPrayerSettingsRepairReason = (patch: Partial<PrayerSettings>) => {
  const keys = Object.keys(patch).sort();
  return keys.length > 0 ? `prayer_settings:${keys.join(',')}` : 'prayer_settings:unknown';
};

export const PrayerSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { showAlert } = useAppAlert();
  const settings = useSettingsStore((s) => s.prayerSettings);
  const setPrayerSettings = useSettingsStore((s) => s.setPrayerSettings);
  const mode = useSettingsStore((s) => s.readerTheme);
  const runtimeHealth = usePrayerStore((s) => s.runtimeHealth);
  const prayerTimes = usePrayerStore((s) => s.prayerTimes);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const selectedVoiceId = normalizeAdhanVoiceId(settings.adhanVoice);
  const [hijriOffset, setHijriOffset] = useState(String(settings.hijriOffset));
  const [previewingVoiceId, setPreviewingVoiceId] = useState<typeof settings.adhanVoice | null>(null);
  const [activeTimePickerPrayer, setActiveTimePickerPrayer] = useState<AdhanPrayerName | null>(null);
  const manualPrayerTimes = React.useMemo(
    () =>
      buildManualPrayerTimesSeed(
        settings.timeMode === 'manual' ? undefined : prayerTimes,
        settings.manualPrayerTimes,
      ),
    [prayerTimes, settings.manualPrayerTimes, settings.timeMode],
  );
  const [pickerTime, setPickerTime] = useState(() => toClockTimeDate(manualPrayerTimes.fajr));
  const previewingVoiceRef = useRef<typeof settings.adhanVoice | null>(null);

  useEffect(() => {
    if (settings.adhanVoice === selectedVoiceId) return;
    void prayerRuntime.updatePrayerSettings(
      { adhanVoice: selectedVoiceId },
      'prayer_settings:normalize_adhan_voice',
    );
  }, [selectedVoiceId, settings.adhanVoice]);

  const setPreviewState = useCallback((voiceId: typeof settings.adhanVoice | null) => {
    previewingVoiceRef.current = voiceId;
    setPreviewingVoiceId(voiceId);
  }, []);

  const applyPrayerPatch = useCallback((patch: Partial<typeof settings>) => {
    void prayerRuntime.updatePrayerSettings(patch, buildPrayerSettingsRepairReason(patch));
  }, []);

  const closeTimePicker = useCallback(() => {
    setActiveTimePickerPrayer(null);
  }, []);

  const enableManualTimeMode = useCallback(async () => {
    const seededTimes = buildManualPrayerTimesSeed(prayerTimes, settings.manualPrayerTimes);
    await prayerRuntime.updatePrayerSettings(
      {
        timeMode: 'manual',
        manualPrayerTimes: seededTimes,
      },
      'prayer_time_mode:manual',
    );
  }, [prayerTimes, settings.manualPrayerTimes]);

  const disableManualTimeMode = useCallback(async () => {
    closeTimePicker();
    await prayerRuntime.updatePrayerSettings({ timeMode: 'auto' }, 'prayer_time_mode:auto');
  }, [closeTimePicker]);

  const commitManualPrayerTime = useCallback(async (prayer: AdhanPrayerName, nextTime: string) => {
    await prayerRuntime.updatePrayerSettings(
      {
        timeMode: 'manual',
        manualPrayerTimes: updateManualPrayerTime(manualPrayerTimes, prayer, nextTime),
      },
      'manual_prayer_times_changed',
    );
  }, [manualPrayerTimes]);

  const openTimePicker = useCallback((prayer: AdhanPrayerName) => {
    if (settings.timeMode !== 'manual') {
      return;
    }
    setPickerTime(toClockTimeDate(manualPrayerTimes[prayer]));
    setActiveTimePickerPrayer(prayer);
  }, [manualPrayerTimes, settings.timeMode]);

  const confirmPickedTime = useCallback(async () => {
    if (!activeTimePickerPrayer) return;
    const nextTime = toClockTimeValue(pickerTime);
    closeTimePicker();
    await commitManualPrayerTime(activeTimePickerPrayer, nextTime);
  }, [activeTimePickerPrayer, closeTimePicker, commitManualPrayerTime, pickerTime]);

  const commitHijriOffset = useCallback(() => {
    applyPrayerPatch({ hijriOffset: Number(hijriOffset) || 0 });
  }, [applyPrayerPatch, hijriOffset]);

  const syncAdhan = async () => {
    const granted = await notificationService.getPermissionStatus();
    if (!granted) {
      const requested = await notificationService.requestPermission();
      if (!requested) {
        showAlert(t('common.error'), t('prayer.runtimeIssues.notification_permission_missing'));
        return;
      }
    }

    await prayerRuntime.requestRepair('manual_repair', {
      allowLocationRefresh: true,
      forceNotificationResync: true,
    });
    showAlert(t('common.done'), t('prayer.adhanSynced'));
  };

  const stopPreview = useCallback(async () => {
    setPreviewState(null);
    await adhanAudioService.stop();
  }, [setPreviewState]);

  const openExactAlarmSettings = useCallback(async () => {
    const opened = await exactAlarmService.openSettings();
    if (!opened) {
      showAlert(t('common.error'), t('prayer.androidExactAlarmUnavailable'));
    }
  }, [showAlert, t]);

  const togglePreview = useCallback(async (voiceId: typeof settings.adhanVoice) => {
    if (previewingVoiceRef.current === voiceId) {
      await stopPreview();
      return;
    }

    setPreviewState(null);
    const ok = await adhanAudioService.playPreview(voiceId, {
      durationMs: PREVIEW_DURATION_MS,
      onStop: () => {
        if (previewingVoiceRef.current === voiceId) {
          setPreviewState(null);
        }
      },
    });

    if (!ok) {
      showAlert(t('common.error'), t('prayer.previewFailed'));
      setPreviewState(null);
      return;
    }

    setPreviewState(voiceId);
  }, [setPreviewState, showAlert, stopPreview, t]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      void stopPreview();
    });

    return unsubscribe;
  }, [navigation, stopPreview]);

  useEffect(() => {
    return () => {
      void adhanAudioService.stop();
    };
  }, []);

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.reliabilityTitle')}</AppText>
        <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
          {t('prayer.reliabilitySummary', {
            until: runtimeHealth.scheduledUntil ?? '--',
            count: runtimeHealth.scheduledCount,
          })}
        </AppText>
        <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
          {runtimeHealth.lastRepairAt
            ? t('prayer.lastRepairAt', { value: runtimeHealth.lastRepairAt })
            : t('prayer.lastRepairMissing')}
        </AppText>
        {runtimeHealth.issues.length > 0 && (
          <AppText variant="bodySm" color={theme.colors.neutral.warning}>
            {runtimeHealth.issues.map((issue) => t(`prayer.runtimeIssues.${issue}`)).join(' • ')}
          </AppText>
        )}
        <AppButton title={t('prayer.repairNow')} onPress={syncAdhan} variant="secondary" />
        {Platform.OS === 'ios' && (
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
            {t('prayer.platformHints.ios')}
          </AppText>
        )}
        {Platform.OS === 'android' && (
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
            {t('prayer.platformHints.android')}
          </AppText>
        )}
      </AppCard>

      {Platform.OS === 'android' && settings.notificationMode !== 'silent' && (
        <AppCard style={styles.sectionCard}>
          <AppText variant="headingSm">{t('prayer.androidExactAlarmTitle')}</AppText>
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
            {t('prayer.androidExactAlarmHint')}
          </AppText>
          <AppButton
            title={t('prayer.androidExactAlarmAction')}
            onPress={() => {
              void openExactAlarmSettings();
            }}
            variant="ghost"
          />
        </AppCard>
      )}

      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.requestLocation')}</AppText>
        <View style={styles.row}>
          <AppButton
            title={t('prayer.useCurrentLocation')}
            variant="primary"
            onPress={() => {
              setPrayerSettings({ locationMode: 'auto' });
              navigation.navigate('PrayerLoading');
            }}
            style={{ flex: 1 }}
          />
        </View>
        <AppButton title={t('prayer.retryLocation')} variant="ghost" onPress={() => navigation.navigate('PrayerLoading')} />
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.calcMethod')}</AppText>
        <View style={styles.optionGrid}>
          {calculationOptions.map((option) => (
            <AppButton
              key={option.key}
              title={t(option.labelKey)}
              onPress={() => applyPrayerPatch({ calculationMethod: option.key })}
              variant={settings.calculationMethod === option.key ? 'primary' : 'ghost'}
              style={styles.gridButton}
            />
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.highLatitudeRule')}</AppText>
        <View style={styles.optionGrid}>
          {highLatitudeOptions.map((option) => (
            <AppButton
              key={option.key}
              title={t(option.labelKey)}
              onPress={() => applyPrayerPatch({ highLatitudeRule: option.key })}
              variant={settings.highLatitudeRule === option.key ? 'primary' : 'ghost'}
              style={styles.gridButton}
            />
          ))}
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.asrMethod')}</AppText>
        <View style={styles.row}>
          <AppButton
            title={t('prayer.methods.shafi')}
            onPress={() => applyPrayerPatch({ asrMethod: 'shafi' })}
            variant={settings.asrMethod === 'shafi' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('prayer.methods.hanafi')}
            onPress={() => applyPrayerPatch({ asrMethod: 'hanafi' })}
            variant={settings.asrMethod === 'hanafi' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.adhanVoice')}</AppText>
        <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
          {t('prayer.adhanVoiceHint')}
        </AppText>

        <View style={styles.voiceList}>
          {adhanVoiceOptions.map((voice) => {
            const label = language === 'ar' ? voice.labelAr : voice.labelEn;
            const selected = selectedVoiceId === voice.id;
            const isPreviewing = previewingVoiceId === voice.id;
            const previewColor = isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;
            return (
              <Pressable
                key={voice.id}
                onPress={() => {
                  applyPrayerPatch({ adhanVoice: voice.id });
                }}
                style={({ pressed }) => [
                  styles.voiceRow,
                  {
                    borderColor: selected ? theme.colors.brand.lightGreen : theme.colors.neutral.borderStrong,
                    backgroundColor: selected
                      ? isDark
                        ? '#1F3B30'
                        : '#ECF7F0'
                      : theme.colors.neutral.backgroundElevated,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={styles.voiceTextWrap}>
                  <AppText variant="bodyLg">{label}</AppText>
                  <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                    {selected ? t('prayer.selectedVoice') : t('prayer.previewVoice')}
                  </AppText>
                </View>
                <View style={styles.voiceActions}>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      void togglePreview(voice.id);
                    }}
                    style={[styles.previewButton, { borderColor: theme.colors.neutral.border, backgroundColor: theme.colors.neutral.surface }]}
                  >
                    <Ionicons name={isPreviewing ? 'stop-outline' : 'play-outline'} size={16} color={previewColor} />
                    <AppText variant="bodySm" color={previewColor}>
                      {isPreviewing ? t('prayer.stopPreview') : t('prayer.playPreview')}
                    </AppText>
                  </Pressable>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={theme.colors.neutral.success} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.notificationMode')}</AppText>
        <View style={styles.optionGrid}>
          {notificationModes.map((option) => (
            <AppButton
              key={option.key}
              title={t(option.labelKey)}
              onPress={() => applyPrayerPatch({ notificationMode: option.key })}
              variant={settings.notificationMode === option.key ? 'primary' : 'ghost'}
              style={styles.gridButton}
            />
          ))}
        </View>
        <SwitchRow
          label={t('prayer.preAdhanReminder')}
          value={settings.preAdhanReminderEnabled}
          onValueChange={(value) => applyPrayerPatch({ preAdhanReminderEnabled: value })}
          description={t('prayer.preAdhanReminderHint', { minutes: settings.preAdhanReminderMinutes })}
        />
        <View style={styles.row}>
          <AppButton
            title="- 5"
            variant="ghost"
            onPress={() =>
              applyPrayerPatch({
                preAdhanReminderMinutes: Math.max(1, settings.preAdhanReminderMinutes - 5),
              })
            }
            style={{ flex: 1 }}
          />
          <AppButton
            title="+ 5"
            variant="ghost"
            onPress={() =>
              applyPrayerPatch({
                preAdhanReminderMinutes: Math.min(60, settings.preAdhanReminderMinutes + 5),
              })
            }
            style={{ flex: 1 }}
          />
        </View>
        {notificationPrayerKeys.map((prayer) => (
          <SwitchRow
            key={prayer}
            label={t(`prayer.names.${prayer}`)}
            value={settings.prayerNotifications[prayer]}
            onValueChange={(value) =>
              applyPrayerPatch({
                prayerNotifications: {
                  ...settings.prayerNotifications,
                  [prayer]: value,
                },
              })
            }
          />
        ))}
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.timeModeTitle')}</AppText>
        <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
          {t('prayer.timeModeHint')}
        </AppText>
        <View style={styles.row}>
          <AppButton
            title={t('prayer.timeModeAuto')}
            onPress={() => {
              void disableManualTimeMode();
            }}
            variant={settings.timeMode === 'auto' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('prayer.timeModeManual')}
            onPress={() => {
              void enableManualTimeMode();
            }}
            variant={settings.timeMode === 'manual' ? 'primary' : 'ghost'}
            style={{ flex: 1 }}
          />
        </View>
        {settings.timeMode === 'manual' ? (
          <>
            <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
              {t('prayer.manualTimesHint')}
            </AppText>
            {notificationPrayerKeys.map((prayer) => (
              <Pressable
                key={prayer}
                onPress={() => openTimePicker(prayer)}
                style={({ pressed }) => [
                  styles.timePickerRow,
                  {
                    borderColor: theme.colors.neutral.borderStrong,
                    backgroundColor: theme.colors.neutral.backgroundElevated,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={styles.timePickerCopy}>
                  <AppText variant="bodyLg">{t(`prayer.names.${prayer}`)}</AppText>
                  <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
                    {t('prayer.manualTimesTapToEdit')}
                  </AppText>
                </View>
                <View style={[styles.timeChip, { backgroundColor: isDark ? theme.colors.neutral.surface : theme.colors.brand.mist }]}>
                  <Ionicons name="time-outline" size={16} color={theme.colors.brand.softGold} />
                  <AppText variant="headingSm" direction="ltr">
                    {manualPrayerTimes[prayer]}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </>
        ) : (
          <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
            {t('prayer.manualTimesAutoHidden')}
          </AppText>
        )}
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppInput
          label={t('prayer.hijriOffset')}
          keyboardType="number-pad"
          value={hijriOffset}
          onChangeText={setHijriOffset}
          onBlur={commitHijriOffset}
          onSubmitEditing={commitHijriOffset}
        />
        <SwitchRow
          label={t('prayer.preciseNotifications')}
          value={settings.preciseNotifications}
          onValueChange={(v) => applyPrayerPatch({ preciseNotifications: v })}
        />
      </AppCard>

      <Modal visible={activeTimePickerPrayer !== null} transparent animationType="fade" onRequestClose={closeTimePicker}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeTimePicker} />
          <View
            style={[
              styles.timePickerSheet,
              {
                backgroundColor: theme.colors.neutral.surface,
                borderColor: theme.colors.neutral.borderStrong,
              },
            ]}
          >
              <View style={styles.timePickerHeader}>
              <AppText variant="headingSm">
                {activeTimePickerPrayer ? t(`prayer.names.${activeTimePickerPrayer}`) : t('prayer.manualTimesTitle')}
              </AppText>
              <Pressable
                onPress={() => {
                  void confirmPickedTime();
                }}
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
              is24Hour
              minuteInterval={1}
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
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  sectionCard: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridButton: {
    minWidth: '48%',
    flexGrow: 1,
  },
  voiceList: {
    gap: 8,
  },
  voiceRow: {
    minHeight: 62,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    gap: 10,
  },
  voiceTextWrap: {
    flex: 1,
    gap: 2,
  },
  voiceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewButton: {
    minHeight: 32,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
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
