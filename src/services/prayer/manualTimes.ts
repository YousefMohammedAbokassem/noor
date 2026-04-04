import { defaultManualPrayerTimes } from '@/services/prayer/defaults';
import { AdhanPrayerName, PrayerManualTimes, PrayerTimes } from '@/types/models';

export const buildManualPrayerTimesSeed = (
  prayerTimes?: PrayerTimes | null,
  fallback?: Partial<PrayerManualTimes>,
): PrayerManualTimes => ({
  fajr: prayerTimes?.fajr ?? fallback?.fajr ?? defaultManualPrayerTimes.fajr,
  dhuhr: prayerTimes?.dhuhr ?? fallback?.dhuhr ?? defaultManualPrayerTimes.dhuhr,
  asr: prayerTimes?.asr ?? fallback?.asr ?? defaultManualPrayerTimes.asr,
  maghrib: prayerTimes?.maghrib ?? fallback?.maghrib ?? defaultManualPrayerTimes.maghrib,
  isha: prayerTimes?.isha ?? fallback?.isha ?? defaultManualPrayerTimes.isha,
});

export const updateManualPrayerTime = (
  times: PrayerManualTimes,
  prayer: AdhanPrayerName,
  nextTime: string,
): PrayerManualTimes => ({
  ...times,
  [prayer]: nextTime,
});
