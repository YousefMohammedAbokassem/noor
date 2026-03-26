export type Language = 'ar' | 'en';
export type NumberFormat = 'arabic' | 'english';
export type ThemeMode = 'light' | 'dark';
export type NotificationPreviewMode = 'private' | 'full';

export type User = {
  id: string;
  email: string;
  fullName?: string;
  preferredLanguage: Language;
  numberFormat: NumberFormat;
  isEmailVerified: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
};

export type KhatmaStartType = 'beginning' | 'juz' | 'surah' | 'page';

export type Khatma = {
  id: string;
  title?: string;
  startType: KhatmaStartType;
  startJuz?: number;
  startSurah?: number;
  startPage: number;
  endPage: number;
  dailyPages: number;
  durationDays: number;
  startedAt: string;
  status: 'active' | 'completed' | 'paused';
  currentPage: number;
  completionPercent: number;
  trackStatus: 'onTrack' | 'ahead' | 'behind';
  updatedAt?: string;
};

export type ReadingProgress = {
  currentPage: number;
  currentJuz: number;
  currentSurah: number;
  lastReadAt: string;
  source?: 'khatma' | 'manual';
  updatedAt?: string;
};

export type Bookmark = {
  id: string;
  page: number;
  surah: number;
  title?: string;
  createdAt: string;
  updatedAt?: string;
};

export type AdhkarCategory = {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: string;
};

export type DhikrItem = {
  id: string;
  categoryId: string;
  textAr: string;
  textEn: string;
  source?: string;
  virtue?: string;
  repeat: number;
};

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type AdhanPrayerName = Exclude<PrayerName, 'sunrise'>;
export type AdhanVoiceId =
  | 'abdul_basit'
  | 'haram_makki'
  | 'haram_nabawi'
  | 'mishary'
  | 'muaiqly';

export type PrayerCalculationMethod =
  | 'muslim_world_league'
  | 'umm_al_qura'
  | 'egyptian'
  | 'karachi'
  | 'dubai'
  | 'moonsighting_committee'
  | 'north_america'
  | 'kuwait'
  | 'qatar'
  | 'singapore'
  | 'tehran'
  | 'turkey';

export type PrayerHighLatitudeRule =
  | 'recommended'
  | 'middle_of_the_night'
  | 'seventh_of_the_night'
  | 'twilight_angle';

export type PrayerNotificationMode = 'adhan_sound' | 'default_sound' | 'silent';
export type PrayerLocationSource = 'gps' | 'manual_preset';

export type PrayerNotificationToggles = {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
};

export type PrayerTimes = {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
  cityName: string;
  timezone?: string;
  utcOffsetMinutes?: number;
  source?: 'fresh' | 'cache';
  timestampByPrayer?: Record<PrayerName, string>;
};

export type PrayerDaySchedule = {
  date: string;
  cityName: string;
  timezone: string;
  utcOffsetMinutes: number;
  source: 'fresh' | 'cache';
  calculationFingerprint: string;
  locationFingerprint: string;
  times: Record<PrayerName, string>;
  timestamps: Record<PrayerName, string>;
};

export type ScheduledNotificationKind = 'adhan' | 'pre_adhan' | 'reminder' | 'dhikr_loop';

export type ScheduledNotificationMeta = {
  id: string;
  kind: ScheduledNotificationKind;
  fireDate: string;
  prayerName?: AdhanPrayerName;
  date: string;
  channelId?: string;
};

export type PrayerRuntimeIssue =
  | 'notification_permission_missing'
  | 'location_permission_missing'
  | 'location_unavailable'
  | 'cache_missing'
  | 'notifications_missing'
  | 'notification_window_truncated'
  | 'background_task_unavailable'
  | 'background_execution_limited'
  | 'exact_alarm_status_unknown'
  | 'using_cached_location';

export type PrayerRuntimeHealth = {
  state: 'ready' | 'attention' | 'degraded';
  lastRepairAt?: string;
  lastRepairReason?: string;
  cacheStartDate?: string;
  cacheEndDate?: string;
  scheduledUntil?: string;
  scheduledCount: number;
  notificationPermissionGranted: boolean;
  locationPermissionGranted: boolean | null;
  backgroundTaskRegistered: boolean;
  issues: PrayerRuntimeIssue[];
};

export type ReminderType = 'wird' | 'morning_adhkar' | 'evening_adhkar' | 'mulk' | 'kahf' | 'baqarah' | `prayer_${PrayerName}`;

export type ReminderSetting = {
  id: string;
  type: ReminderType;
  enabled: boolean;
  time: string;
};

export type DhikrLoopSettings = {
  enabled: boolean;
  intervalMinutes: number;
};

export type AdhanTestSchedule = {
  enabled: boolean;
  times: Record<AdhanPrayerName, string>;
};

export type PrayerSettings = {
  locationMode: 'auto' | 'manual';
  city?: string;
  country?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
  timeZone?: string;
  locationLabel?: string;
  locationSource?: PrayerLocationSource;
  locationUpdatedAt?: string;
  presetCityId?: string;
  calculationMethod: PrayerCalculationMethod;
  highLatitudeRule: PrayerHighLatitudeRule;
  asrMethod: 'shafi' | 'hanafi';
  adhanVoice: AdhanVoiceId;
  notificationMode: PrayerNotificationMode;
  notificationPreviewMode: NotificationPreviewMode;
  prayerNotifications: PrayerNotificationToggles;
  preAdhanReminderEnabled: boolean;
  preAdhanReminderMinutes: number;
  fajrOffset: number;
  dhuhrOffset: number;
  asrOffset: number;
  maghribOffset: number;
  ishaOffset: number;
  hijriOffset: number;
  preciseNotifications: boolean;
  updatedAt?: string;
};

export type DeviceMeta = {
  deviceId: string;
  platform: 'ios' | 'android';
  appVersion: string;
  locale: string;
  pushToken?: string;
};

export type SyncMetadata = {
  khatmaUpdatedAt?: string;
  readingProgressUpdatedAt?: string;
  bookmarksUpdatedAt?: string;
  prayerSettingsUpdatedAt?: string;
  remindersUpdatedAt?: string;
};
