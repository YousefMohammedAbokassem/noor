import { defaultPrayerSettings, normalizePrayerSettings } from '@/services/prayer/defaults';

describe('normalizePrayerSettings', () => {
  it('defaults notification previews to full mode', () => {
    expect(defaultPrayerSettings.notificationPreviewMode).toBe('full');
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
    expect(settings.notificationPreviewMode).toBe('full');
  });
});
