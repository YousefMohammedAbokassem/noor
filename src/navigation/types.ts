import { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  QuranHome: undefined;
  Home: undefined;
  AdhkarCategories: undefined;
  Tasbeeh: undefined;
  QiblaTab: undefined;
};

export type PermissionGateNextRoute = 'Language' | 'Onboarding' | 'MainTabs';

export type RootStackParamList = {
  Splash: undefined;
  PermissionGate: { nextRoute: PermissionGateNextRoute };
  Language: undefined;
  Onboarding: undefined;
  Login: { email?: string; successMessage?: string } | undefined;
  Register: undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: { email?: string } | undefined;
  VerifyEmail: { email?: string } | undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  CreateKhatmaStep1: undefined;
  CreateKhatmaStep2: { startType: 'beginning' | 'juz' | 'surah' | 'page'; startPage: number };
  JuzIndex: undefined;
  SurahIndex: undefined;
  QuranReader: { page?: number; surah?: number; juz?: number } | undefined;
  DhikrContent: { categoryId: string; startIndex?: number };
  PrayerLocationRequest: undefined;
  PrayerLoading: undefined;
  PrayerLocationSuccess: undefined;
  PrayerSettings: undefined;
  Qibla: undefined;
  Reminders: undefined;
  AccountSync: undefined;
  LocationFailure: undefined;
  ManualCity: undefined;
  MoreSettings: undefined;
  Support: undefined;
  RatingExperience: undefined;
};
