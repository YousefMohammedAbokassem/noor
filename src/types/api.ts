import {
  AuthTokens,
  Bookmark,
  DeviceMeta,
  Khatma,
  PrayerSettings,
  ReadingProgress,
  ReminderSetting,
  SyncMetadata,
  User,
} from './models';

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type LoginPayload = {
  email: string;
  password: string;
  device: DeviceMeta;
};

export type RegisterPayload = {
  email: string;
  password: string;
  fullName?: string;
  preferredLanguage: 'ar' | 'en';
  numberFormat: 'arabic' | 'english';
  device: DeviceMeta;
};

export type AuthResponse = {
  user: User;
  tokens: AuthTokens;
};

export type SyncPayload = {
  khatma?: Khatma;
  readingProgress?: ReadingProgress;
  bookmarks?: Bookmark[];
  prayerSettings?: PrayerSettings;
  reminders?: ReminderSetting[];
  localUpdatedAt: string;
  syncMetadata?: SyncMetadata;
};

export type SyncResponse = {
  mergedAt: string;
  khatma?: Khatma;
  readingProgress?: ReadingProgress;
  bookmarks?: Bookmark[];
  prayerSettings?: PrayerSettings;
  reminders?: ReminderSetting[];
  syncMetadata?: SyncMetadata;
};
