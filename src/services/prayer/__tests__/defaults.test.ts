import { defaultPrayerSettings, normalizePrayerSettings } from '@/services/prayer/defaults';

describe('normalizePrayerSettings', () => {
  it('defaults notification previews to private mode', () => {
    expect(defaultPrayerSettings.notificationPreviewMode).toBe('private');
  });

  it('uses the current Syria defaults for first-run prayer times', () => {
    expect(defaultPrayerSettings.locationMode).toBe('manual');
    expect(defaultPrayerSettings.city).toBe('Damascus');
    expect(defaultPrayerSettings.countryCode).toBe('SY');
    expect(defaultPrayerSettings.timeZone).toBe('Asia/Damascus');
    expect(defaultPrayerSettings.calculationMethod).toBe('egyptian');
    expect(defaultPrayerSettings.asrMethod).toBe('shafi');
  });

  it('rounds coordinates and rejects invalid preview modes', () => {
    const settings = normalizePrayerSettings({
      locationMode: 'manual',
      latitude: 33.5138123,
      longitude: 36.2765123,
      timeZone: 'Asia/Damascus',
      notificationPreviewMode: 'unexpected' as never,
    });

    expect(settings.latitude).toBe(33.5138);
    expect(settings.longitude).toBe(36.2765);
    expect(settings.notificationPreviewMode).toBe('private');
  });

  it('preserves private notification preview mode', () => {
    const settings = normalizePrayerSettings({
      notificationPreviewMode: 'private',
    });

    expect(settings.notificationPreviewMode).toBe('private');
  });
});
