import {
  AdhanTestSchedule,
  PrayerNotificationToggles,
  NotificationPreviewMode,
  PrayerSettings,
  PrayerHighLatitudeRule,
  PrayerNotificationMode,
} from '@/types/models';
import { normalizeClockTimeInput } from '@/utils/time';

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
};

const roundCoordinate = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.round(numeric * 10_000) / 10_000;
};

const allowedNotificationModes: PrayerNotificationMode[] = ['adhan_sound', 'default_sound', 'silent'];
const allowedPreviewModes: NotificationPreviewMode[] = ['full'];
const allowedHighLatitudeRules: PrayerHighLatitudeRule[] = [
  'recommended',
  'middle_of_the_night',
  'seventh_of_the_night',
  'twilight_angle',
];

export const defaultPrayerNotifications: PrayerNotificationToggles = {
  fajr: true,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
};

export const defaultAdhanTestSchedule: AdhanTestSchedule = {
  enabled: false,
  times: {
    fajr: '05:00',
    dhuhr: '12:00',
    asr: '15:30',
    maghrib: '18:00',
    isha: '20:00',
  },
};

export const defaultPrayerSettings: PrayerSettings = {
  locationMode: 'auto',
  calculationMethod: 'umm_al_qura',
  highLatitudeRule: 'recommended',
  asrMethod: 'shafi',
  adhanVoice: 'abdul_basit',
  notificationMode: 'adhan_sound',
  notificationPreviewMode: 'full',
  prayerNotifications: defaultPrayerNotifications,
  preAdhanReminderEnabled: false,
  preAdhanReminderMinutes: 10,
  fajrOffset: 0,
  dhuhrOffset: 0,
  asrOffset: 0,
  maghribOffset: 0,
  ishaOffset: 0,
  hijriOffset: 0,
  preciseNotifications: false,
};

export const normalizeAdhanTestSchedule = (value?: Partial<AdhanTestSchedule> | null): AdhanTestSchedule => ({
  enabled: value?.enabled === true,
  times: {
    fajr: normalizeClockTimeInput(value?.times?.fajr ?? '') ?? defaultAdhanTestSchedule.times.fajr,
    dhuhr: normalizeClockTimeInput(value?.times?.dhuhr ?? '') ?? defaultAdhanTestSchedule.times.dhuhr,
    asr: normalizeClockTimeInput(value?.times?.asr ?? '') ?? defaultAdhanTestSchedule.times.asr,
    maghrib: normalizeClockTimeInput(value?.times?.maghrib ?? '') ?? defaultAdhanTestSchedule.times.maghrib,
    isha: normalizeClockTimeInput(value?.times?.isha ?? '') ?? defaultAdhanTestSchedule.times.isha,
  },
});

export const normalizePrayerSettings = (value?: Partial<PrayerSettings> | null): PrayerSettings => {
  const merged: PrayerSettings = {
    ...defaultPrayerSettings,
    ...(value ?? {}),
    prayerNotifications: {
      ...defaultPrayerNotifications,
      ...(value?.prayerNotifications ?? {}),
    },
  };

  return {
    ...merged,
    locationMode: merged.locationMode === 'manual' ? 'manual' : 'auto',
    latitude: roundCoordinate(merged.latitude),
    longitude: roundCoordinate(merged.longitude),
    city: merged.city?.trim() || undefined,
    country: merged.country?.trim() || undefined,
    countryCode: merged.countryCode?.trim().toUpperCase() || undefined,
    timeZone: merged.timeZone?.trim() || undefined,
    locationLabel: merged.locationLabel?.trim() || undefined,
    locationUpdatedAt: merged.locationUpdatedAt || undefined,
    presetCityId: merged.presetCityId?.trim() || undefined,
    calculationMethod: merged.calculationMethod ?? defaultPrayerSettings.calculationMethod,
    highLatitudeRule: allowedHighLatitudeRules.includes(merged.highLatitudeRule)
      ? merged.highLatitudeRule
      : defaultPrayerSettings.highLatitudeRule,
    asrMethod: merged.asrMethod === 'hanafi' ? 'hanafi' : 'shafi',
    adhanVoice: merged.adhanVoice ?? defaultPrayerSettings.adhanVoice,
    notificationMode: allowedNotificationModes.includes(merged.notificationMode)
      ? merged.notificationMode
      : defaultPrayerSettings.notificationMode,
    notificationPreviewMode: allowedPreviewModes.includes(merged.notificationPreviewMode)
      ? merged.notificationPreviewMode
      : defaultPrayerSettings.notificationPreviewMode,
    prayerNotifications: {
      fajr: merged.prayerNotifications.fajr !== false,
      dhuhr: merged.prayerNotifications.dhuhr !== false,
      asr: merged.prayerNotifications.asr !== false,
      maghrib: merged.prayerNotifications.maghrib !== false,
      isha: merged.prayerNotifications.isha !== false,
    },
    preAdhanReminderEnabled: merged.preAdhanReminderEnabled === true,
    preAdhanReminderMinutes: clampNumber(
      merged.preAdhanReminderMinutes,
      defaultPrayerSettings.preAdhanReminderMinutes,
      1,
      60,
    ),
    fajrOffset: clampNumber(merged.fajrOffset, 0, -120, 120),
    dhuhrOffset: clampNumber(merged.dhuhrOffset, 0, -120, 120),
    asrOffset: clampNumber(merged.asrOffset, 0, -120, 120),
    maghribOffset: clampNumber(merged.maghribOffset, 0, -120, 120),
    ishaOffset: clampNumber(merged.ishaOffset, 0, -120, 120),
    hijriOffset: clampNumber(merged.hijriOffset, 0, -10, 10),
    preciseNotifications: merged.preciseNotifications === true,
    updatedAt: merged.updatedAt || undefined,
  };
};
