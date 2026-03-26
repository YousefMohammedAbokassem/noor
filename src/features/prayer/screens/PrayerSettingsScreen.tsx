import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/components/ui/Screen';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { useSettingsStore } from '@/state/settingsStore';
import { usePrayerStore } from '@/state/prayerStore';
import { useAuthStore } from '@/state/authStore';
import { adhanVoiceOptions, normalizeAdhanVoiceId } from '@/constants/adhan';
import { notificationService } from '@/services/notificationService';
import { adhanAudioService } from '@/services/adhanAudioService';
import { getThemeByMode } from '@/theme';
import { AdhanPrayerName, PrayerNotificationMode } from '@/types/models';
import { prayerRuntime } from '@/services/prayer/prayerRuntime';
import { normalizeClockTimeInput } from '@/utils/time';

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

export const PrayerSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.prayerSettings);
  const adhanTestSchedule = useSettingsStore((s) => s.adhanTestSchedule);
  const setPrayerSettings = useSettingsStore((s) => s.setPrayerSettings);
  const setAdhanTestSchedule = useSettingsStore((s) => s.setAdhanTestSchedule);
  const mode = useSettingsStore((s) => s.readerTheme);
  const runtimeHealth = usePrayerStore((s) => s.runtimeHealth);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const selectedVoiceId = normalizeAdhanVoiceId(settings.adhanVoice);
  const [hijriOffset, setHijriOffset] = useState(String(settings.hijriOffset));
  const [previewingVoiceId, setPreviewingVoiceId] = useState<typeof settings.adhanVoice | null>(null);
  const [adhanTestTimeDrafts, setAdhanTestTimeDrafts] = useState<Record<AdhanPrayerName, string>>(
    adhanTestSchedule.times,
  );
  const [adhanTestTimeErrors, setAdhanTestTimeErrors] = useState<Partial<Record<AdhanPrayerName, string>>>({});
  const previewingVoiceRef = useRef<typeof settings.adhanVoice | null>(null);

  useEffect(() => {
    if (settings.adhanVoice === selectedVoiceId) return;
    setPrayerSettings({ adhanVoice: selectedVoiceId });
  }, [selectedVoiceId, setPrayerSettings, settings.adhanVoice]);

  useEffect(() => {
    setAdhanTestTimeDrafts(adhanTestSchedule.times);
  }, [adhanTestSchedule.times]);

  const setPreviewState = useCallback((voiceId: typeof settings.adhanVoice | null) => {
    previewingVoiceRef.current = voiceId;
    setPreviewingVoiceId(voiceId);
  }, []);

  const applyPrayerPatch = useCallback((patch: Partial<typeof settings>) => {
    setPrayerSettings(patch);
  }, [setPrayerSettings]);

  const setAdhanTestError = useCallback((prayer: AdhanPrayerName, error?: string) => {
    setAdhanTestTimeErrors((current) => ({
      ...current,
      [prayer]: error,
    }));
  }, []);

  const normalizeAdhanTestDraft = useCallback((prayer: AdhanPrayerName) => {
    const normalized = normalizeClockTimeInput(adhanTestTimeDrafts[prayer] ?? '');
    if (!normalized) {
      setAdhanTestError(prayer, t('prayer.testScheduleInvalid'));
      return null;
    }

    setAdhanTestTimeDrafts((current) => ({
      ...current,
      [prayer]: normalized,
    }));
    setAdhanTestError(prayer, undefined);
    return normalized;
  }, [adhanTestTimeDrafts, setAdhanTestError, t]);

  const applyAdhanTestSchedule = useCallback(async () => {
    const nextTimes = {} as Record<AdhanPrayerName, string>;
    let hasInvalidTime = false;

    for (const prayer of notificationPrayerKeys) {
      const normalized = normalizeClockTimeInput(adhanTestTimeDrafts[prayer] ?? adhanTestSchedule.times[prayer]);
      if (!normalized) {
        hasInvalidTime = true;
        setAdhanTestError(prayer, t('prayer.testScheduleInvalid'));
        continue;
      }

      nextTimes[prayer] = normalized;
    }

    if (hasInvalidTime) {
      Alert.alert(t('common.error'), t('prayer.testScheduleInvalid'));
      return;
    }

    setAdhanTestTimeDrafts(nextTimes);
    setAdhanTestTimeErrors({});
    setAdhanTestSchedule({ times: nextTimes });
    await prayerRuntime.requestRepair('adhan_test_schedule_changed', {
      allowLocationRefresh: settings.locationMode !== 'manual',
      forceNotificationResync: true,
    });
    Alert.alert(t('common.done'), t('prayer.testScheduleSaved'));
  }, [
    adhanTestSchedule.times,
    adhanTestTimeDrafts,
    setAdhanTestError,
    setAdhanTestSchedule,
    settings.locationMode,
    t,
  ]);

  const toggleAdhanTestSchedule = useCallback((value: boolean) => {
    setAdhanTestSchedule({ enabled: value });
    void prayerRuntime.requestRepair('adhan_test_schedule_toggled', {
      allowLocationRefresh: settings.locationMode !== 'manual',
      forceNotificationResync: true,
    });
  }, [setAdhanTestSchedule, settings.locationMode]);

  const syncAdhan = async () => {
    const granted = await notificationService.getPermissionStatus();
    if (!granted) {
      const requested = await notificationService.requestPermission();
      if (!requested) {
        Alert.alert(t('common.error'), t('prayer.runtimeIssues.notification_permission_missing'));
        return;
      }
    }

    await prayerRuntime.requestRepair('manual_repair', {
      allowLocationRefresh: settings.locationMode !== 'manual',
      forceNotificationResync: true,
    });
    Alert.alert(t('common.done'), t('prayer.adhanSynced'));
  };

  const stopPreview = useCallback(async () => {
    setPreviewState(null);
    await adhanAudioService.stop();
  }, [setPreviewState]);

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
      Alert.alert(t('common.error'), t('prayer.previewFailed'));
      setPreviewState(null);
      return;
    }

    setPreviewState(voiceId);
  }, [setPreviewState, stopPreview, t]);

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
    <Screen showDecorations={false} contentStyle={styles.content}>
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

      <AppCard style={styles.sectionCard}>
        <AppText variant="headingSm">{t('prayer.requestLocation')}</AppText>
        <View style={styles.row}>
          <AppButton
            title={t('prayer.useCurrentLocation')}
            variant={settings.locationMode === 'auto' ? 'primary' : 'ghost'}
            onPress={() => {
              applyPrayerPatch({ locationMode: 'auto' });
              navigation.navigate('PrayerLoading');
            }}
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('prayer.manualCity')}
            variant={settings.locationMode === 'manual' ? 'primary' : 'ghost'}
            onPress={() => applyPrayerPatch({ locationMode: 'manual' })}
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.row}>
          <AppButton
            title={t('prayer.manualCity')}
            variant="secondary"
            onPress={() => navigation.navigate('ManualCity')}
            style={{ flex: 1 }}
          />
          <AppButton
            title={t('prayer.retryLocation')}
            variant="ghost"
            onPress={() => navigation.navigate('PrayerLoading')}
            style={{ flex: 1 }}
          />
        </View>
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
                  setPrayerSettings({ adhanVoice: voice.id });
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
        <AppText variant="headingSm">{t('prayer.testScheduleTitle')}</AppText>
        <AppText variant="bodySm" color={theme.colors.neutral.textSecondary}>
          {t('prayer.testScheduleHint')}
        </AppText>
        <SwitchRow
          label={t('prayer.testScheduleEnabled')}
          value={adhanTestSchedule.enabled}
          onValueChange={toggleAdhanTestSchedule}
          description={t('prayer.testScheduleLocalOnly')}
        />
        {notificationPrayerKeys.map((prayer) => (
          <AppInput
            key={prayer}
            label={t(`prayer.names.${prayer}`)}
            value={adhanTestTimeDrafts[prayer]}
            onChangeText={(value) =>
              setAdhanTestTimeDrafts((current) => ({
                ...current,
                [prayer]: value,
              }))
            }
            onBlur={() => {
              normalizeAdhanTestDraft(prayer);
            }}
            onSubmitEditing={() => {
              normalizeAdhanTestDraft(prayer);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="HH:mm"
            error={adhanTestTimeErrors[prayer]}
          />
        ))}
        <AppButton title={t('prayer.testScheduleApply')} onPress={() => void applyAdhanTestSchedule()} variant="secondary" />
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppInput
          label={t('prayer.hijriOffset')}
          keyboardType="number-pad"
          value={hijriOffset}
          onChangeText={setHijriOffset}
        />
        <AppButton title={t('common.save')} onPress={() => applyPrayerPatch({ hijriOffset: Number(hijriOffset) || 0 })} />
        <SwitchRow
          label={t('prayer.preciseNotifications')}
          value={settings.preciseNotifications}
          onValueChange={(v) => applyPrayerPatch({ preciseNotifications: v })}
        />
      </AppCard>
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
});
