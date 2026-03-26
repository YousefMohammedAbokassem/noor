import { AdhanTestSchedule, PrayerDaySchedule, PrayerSettings } from '@/types/models';

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
};

const roundCoordinate = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(5)) : null;

export const buildLocationFingerprint = (settings: PrayerSettings, timeZone: string) =>
  stableStringify({
    locationMode: settings.locationMode,
    latitude: roundCoordinate(settings.latitude),
    longitude: roundCoordinate(settings.longitude),
    city: settings.city ?? '',
    country: settings.country ?? '',
    timeZone,
    locationSource: settings.locationSource ?? '',
    presetCityId: settings.presetCityId ?? '',
  });

export const buildCalculationFingerprint = (settings: PrayerSettings) =>
  stableStringify({
    calculationMethod: settings.calculationMethod,
    highLatitudeRule: settings.highLatitudeRule,
    asrMethod: settings.asrMethod,
    fajrOffset: settings.fajrOffset,
    dhuhrOffset: settings.dhuhrOffset,
    asrOffset: settings.asrOffset,
    maghribOffset: settings.maghribOffset,
    ishaOffset: settings.ishaOffset,
    preciseNotifications: settings.preciseNotifications,
  });

export const buildNotificationFingerprint = (
  settings: PrayerSettings,
  lang: 'ar' | 'en',
  days: PrayerDaySchedule[],
  adhanTestSchedule?: AdhanTestSchedule,
) =>
  stableStringify({
    lang,
    notificationMode: settings.notificationMode,
    notificationPreviewMode: settings.notificationPreviewMode,
    adhanVoice: settings.adhanVoice,
    preAdhanReminderEnabled: settings.preAdhanReminderEnabled,
    preAdhanReminderMinutes: settings.preAdhanReminderMinutes,
    prayerNotifications: settings.prayerNotifications,
    adhanTestSchedule: adhanTestSchedule
      ? {
          enabled: adhanTestSchedule.enabled,
          times: adhanTestSchedule.times,
        }
      : null,
    days: days.map((day) => ({
      date: day.date,
      timezone: day.timezone,
      timestamps: day.timestamps,
    })),
  });
