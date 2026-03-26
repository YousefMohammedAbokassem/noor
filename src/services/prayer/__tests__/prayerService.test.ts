import { prayerService } from '@/services/prayerService';
import { defaultPrayerSettings } from '@/services/prayer/defaults';

describe('PrayerTimeService', () => {
  const damascusSettings = {
    ...defaultPrayerSettings,
    locationMode: 'manual' as const,
    city: 'Damascus',
    country: 'Syria',
    latitude: 33.5138,
    longitude: 36.2765,
    timeZone: 'Asia/Damascus',
    locationLabel: 'Damascus',
    locationSource: 'manual_preset' as const,
  };

  it('builds deterministic prayer schedules for the same inputs', () => {
    const first = prayerService.buildPrayerDay('2026-03-25', damascusSettings);
    const second = prayerService.buildPrayerDay('2026-03-25', damascusSettings);

    expect(second).toEqual(first);
    expect(first.timezone).toBe('Asia/Damascus');
    expect(first.times.fajr).toMatch(/^\d{2}:\d{2}$/);
    expect(first.timestamps.fajr).toMatch(/Z$/);
  });

  it('changes calculated times when the calculation method changes', () => {
    const ummAlQura = prayerService.buildPrayerDay('2026-03-25', damascusSettings);
    const mwl = prayerService.buildPrayerDay('2026-03-25', {
      ...damascusSettings,
      calculationMethod: 'muslim_world_league',
    });

    expect(
      mwl.times.fajr !== ummAlQura.times.fajr || mwl.times.isha !== ummAlQura.times.isha,
    ).toBe(true);
  });
});
