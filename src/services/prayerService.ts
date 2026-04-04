import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes as AdhanPrayerTimes,
  Rounding,
} from 'adhan';
import { PrayerDaySchedule, PrayerName, PrayerSettings, PrayerTimes } from '@/types/models';
import {
  buildCalendarDate,
  combineDateAndTimeInZone,
  formatTimeInTimeZone,
  getDeviceTimeZone,
  getOffsetMinutes,
} from '@/services/prayer/dateTime';
import {
  buildCalculationFingerprint,
  buildLocationFingerprint,
} from '@/services/prayer/fingerprints';
import { normalizePrayerSettings } from '@/services/prayer/defaults';

const prayerKeys: PrayerName[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

const calculationMethodFactories = {
  muslim_world_league: () => CalculationMethod.MuslimWorldLeague(),
  umm_al_qura: () => CalculationMethod.UmmAlQura(),
  egyptian: () => CalculationMethod.Egyptian(),
  karachi: () => CalculationMethod.Karachi(),
  dubai: () => CalculationMethod.Dubai(),
  moonsighting_committee: () => CalculationMethod.MoonsightingCommittee(),
  north_america: () => CalculationMethod.NorthAmerica(),
  kuwait: () => CalculationMethod.Kuwait(),
  qatar: () => CalculationMethod.Qatar(),
  singapore: () => CalculationMethod.Singapore(),
  tehran: () => CalculationMethod.Tehran(),
  turkey: () => CalculationMethod.Turkey(),
} as const;

const highLatitudeRules = {
  middle_of_the_night: HighLatitudeRule.MiddleOfTheNight,
  seventh_of_the_night: HighLatitudeRule.SeventhOfTheNight,
  twilight_angle: HighLatitudeRule.TwilightAngle,
} as const;

const buildLocationLabel = (settings: PrayerSettings) =>
  settings.locationLabel ?? settings.city ?? settings.country ?? 'Prayer Times';

const toPrayerTimes = (day: PrayerDaySchedule, source: PrayerTimes['source'] = 'fresh'): PrayerTimes => ({
  date: day.date,
  cityName: day.cityName,
  timezone: day.timezone,
  utcOffsetMinutes: day.utcOffsetMinutes,
  source,
  timestampByPrayer: day.timestamps,
  fajr: day.times.fajr,
  sunrise: day.times.sunrise,
  dhuhr: day.times.dhuhr,
  asr: day.times.asr,
  maghrib: day.times.maghrib,
  isha: day.times.isha,
});

class PrayerTimeService {
  private buildParameters(settings: PrayerSettings) {
    const params =
      calculationMethodFactories[settings.calculationMethod]?.() ??
      calculationMethodFactories.umm_al_qura();

    params.madhab = settings.asrMethod === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
    params.rounding = settings.preciseNotifications ? Rounding.None : Rounding.Nearest;
    params.adjustments.fajr = settings.fajrOffset;
    params.adjustments.dhuhr = settings.dhuhrOffset;
    params.adjustments.asr = settings.asrOffset;
    params.adjustments.maghrib = settings.maghribOffset;
    params.adjustments.isha = settings.ishaOffset;

    return params;
  }

  resolveTimeZone(settings: PrayerSettings) {
    return settings.timeZone ?? getDeviceTimeZone();
  }

  buildPrayerDay(dateKey: string, rawSettings: PrayerSettings): PrayerDaySchedule {
    const settings = normalizePrayerSettings(rawSettings);
    if (typeof settings.latitude !== 'number' || typeof settings.longitude !== 'number') {
      throw new Error('prayer_location_missing');
    }

    const timeZone = this.resolveTimeZone(settings);
    const coordinates = new Coordinates(settings.latitude, settings.longitude);
    const calculationDate = buildCalendarDate(dateKey);
    const parameters = this.buildParameters(settings);
    parameters.highLatitudeRule =
      settings.highLatitudeRule === 'recommended'
        ? HighLatitudeRule.recommended(coordinates)
        : highLatitudeRules[settings.highLatitudeRule];
    const adhanTimes = new AdhanPrayerTimes(coordinates, calculationDate, parameters);

    const timestamps = prayerKeys.reduce<Record<PrayerName, string>>((acc, prayer) => {
      const moment = adhanTimes[prayer];
      acc[prayer] = moment.toISOString();
      return acc;
    }, {} as Record<PrayerName, string>);

    const times = prayerKeys.reduce<Record<PrayerName, string>>((acc, prayer) => {
      acc[prayer] = formatTimeInTimeZone(new Date(timestamps[prayer]), timeZone);
      return acc;
    }, {} as Record<PrayerName, string>);

    if (settings.timeMode === 'manual') {
      for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
        const manualTime = settings.manualPrayerTimes[prayer];
        times[prayer] = manualTime;
        timestamps[prayer] = combineDateAndTimeInZone(dateKey, manualTime, timeZone).toISOString();
      }
    }

    return {
      date: dateKey,
      cityName: buildLocationLabel(settings),
      timezone: timeZone,
      utcOffsetMinutes: getOffsetMinutes(new Date(timestamps.dhuhr), timeZone),
      source: 'fresh',
      calculationFingerprint: buildCalculationFingerprint(settings),
      locationFingerprint: buildLocationFingerprint(settings, timeZone),
      times,
      timestamps,
    };
  }

  buildPrayerTimesForDate(rawSettings: PrayerSettings, dateKey: string): PrayerTimes {
    return toPrayerTimes(this.buildPrayerDay(dateKey, rawSettings));
  }

  toPrayerTimes(day: PrayerDaySchedule, source: PrayerTimes['source'] = 'fresh') {
    return toPrayerTimes(day, source);
  }
}

export const prayerService = new PrayerTimeService();
