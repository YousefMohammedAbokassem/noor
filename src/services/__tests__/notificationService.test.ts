import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultPrayerSettings } from '@/services/prayer/defaults';
import { notificationService } from '@/services/notificationService';
import { PrayerDaySchedule, PrayerSettings } from '@/types/models';

const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();
const mockAddNotificationReceivedListener = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockSetNotificationCategoryAsync = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockGetLastNotificationResponseAsync = jest.fn();
const mockClearLastNotificationResponseAsync = jest.fn();
const mockDismissNotificationAsync = jest.fn();

jest.mock('expo-notifications', () => ({
  AndroidImportance: {
    HIGH: 'high',
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    DAILY: 'daily',
    TIME_INTERVAL: 'timeInterval',
  },
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  setNotificationHandler: mockSetNotificationHandler,
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  setNotificationCategoryAsync: mockSetNotificationCategoryAsync,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
  getLastNotificationResponseAsync: mockGetLastNotificationResponseAsync,
  clearLastNotificationResponseAsync: mockClearLastNotificationResponseAsync,
  dismissNotificationAsync: mockDismissNotificationAsync,
}));

jest.mock('@/services/adhanAudioService', () => ({
  adhanAudioService: {
    playPrayerAdhan: jest.fn(),
    stop: jest.fn(),
  },
}));

const makeDay = (date: string, overrides: Partial<PrayerDaySchedule> = {}): PrayerDaySchedule => {
  const timestamps = {
    fajr: `${date}T03:10:00.000Z`,
    sunrise: `${date}T04:45:00.000Z`,
    dhuhr: `${date}T09:35:00.000Z`,
    asr: `${date}T13:00:00.000Z`,
    maghrib: `${date}T16:22:00.000Z`,
    isha: `${date}T17:48:00.000Z`,
  };

  return {
    date,
    cityName: 'Damascus',
    timezone: 'Asia/Damascus',
    utcOffsetMinutes: 180,
    source: 'fresh',
    calculationFingerprint: `calc-${date}`,
    locationFingerprint: 'loc-damascus',
    times: {
      fajr: '06:10',
      sunrise: '07:45',
      dhuhr: '12:35',
      asr: '16:00',
      maghrib: '19:22',
      isha: '20:48',
    },
    timestamps,
    ...overrides,
  };
};

const settings = (overrides: Partial<PrayerSettings> = {}): PrayerSettings => ({
  ...defaultPrayerSettings,
  ...overrides,
  prayerNotifications: {
    ...defaultPrayerSettings.prayerNotifications,
    ...(overrides.prayerNotifications ?? {}),
  },
});

describe('notificationService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2026-05-06T00:00:00.000Z'));
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    mockGetPermissionsAsync.mockResolvedValue({
      granted: true,
      status: 'granted',
      canAskAgain: true,
    });
    mockRequestPermissionsAsync.mockResolvedValue({
      granted: true,
      status: 'granted',
      canAskAgain: true,
    });
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);
    mockScheduleNotificationAsync.mockResolvedValue('scheduled-id');
    mockCancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockSetNotificationChannelAsync.mockResolvedValue(undefined);
    mockSetNotificationCategoryAsync.mockResolvedValue(undefined);
    mockAddNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
    mockGetLastNotificationResponseAsync.mockResolvedValue(null);
    mockClearLastNotificationResponseAsync.mockResolvedValue(undefined);
    mockDismissNotificationAsync.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await AsyncStorage.clear();
    jest.useRealTimers();
  });

  it('schedules every enabled adhan notification at the exact computed fire date', async () => {
    const day = makeDay('2026-05-06');

    const result = await notificationService.ensureAdhanSchedule({
      days: [day],
      settings: settings(),
      lang: 'en',
      now: new Date('2026-05-06T00:00:00.000Z'),
      force: true,
    });

    expect(result).toEqual({
      granted: true,
      scheduledCount: 5,
      scheduledUntil: '2026-05-06',
      truncated: false,
    });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(5);

    for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: `noor-prayer-adhan-2026-05-06-${prayer}`,
          trigger: expect.objectContaining({
            type: 'date',
            date: new Date(day.timestamps[prayer]),
          }),
        }),
      );
    }
  });

  it('cancels stale adhan notifications and reschedules when notification settings change', async () => {
    const day = makeDay('2026-05-06');

    await notificationService.ensureAdhanSchedule({
      days: [day],
      settings: settings(),
      lang: 'en',
      now: new Date('2026-05-06T00:00:00.000Z'),
      force: true,
    });

    mockGetAllScheduledNotificationsAsync.mockResolvedValue(
      mockScheduleNotificationAsync.mock.calls.map(([request]) => ({
        identifier: request.identifier,
      })),
    );
    mockScheduleNotificationAsync.mockClear();

    await notificationService.ensureAdhanSchedule({
      days: [day],
      settings: settings({ notificationMode: 'silent' }),
      lang: 'en',
      now: new Date('2026-05-06T00:00:00.000Z'),
      force: false,
    });

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(5);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(5);
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'noor-prayer-adhan-2026-05-06-fajr',
        content: expect.objectContaining({
          sound: false,
        }),
        trigger: expect.objectContaining({
          channelId: 'adhan-silent',
        }),
      }),
    );
  });

  it('does not schedule adhan notifications when permission is disabled', async () => {
    mockGetPermissionsAsync.mockResolvedValue({
      granted: false,
      status: 'denied',
      canAskAgain: false,
    });

    const result = await notificationService.ensureAdhanSchedule({
      days: [makeDay('2026-05-06')],
      settings: settings(),
      lang: 'en',
      now: new Date('2026-05-06T00:00:00.000Z'),
      force: true,
    });

    expect(result).toEqual({
      granted: false,
      scheduledCount: 0,
      truncated: false,
    });
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('clears all account-scoped notification identifiers, including Android dhikr fallbacks', async () => {
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: 'noor-prayer-adhan-2026-05-06-fajr' },
      { identifier: 'noor-prayer-preadhan-2026-05-06-fajr' },
      { identifier: 'noor-reminder-daily_wird-2026-05-06' },
      { identifier: 'noor-dhikr-loop-1' },
      { identifier: 'unrelated-system-notification' },
    ]);

    await notificationService.clearAccountScopedNotifications();

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('noor-prayer-adhan-2026-05-06-fajr');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('noor-prayer-preadhan-2026-05-06-fajr');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('noor-reminder-daily_wird-2026-05-06');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('noor-dhikr-loop-1');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith('noor-dhikr-loop');
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalledWith('unrelated-system-notification');
  });
});
