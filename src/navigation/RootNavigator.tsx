import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from './types';
import { SplashScreen } from '@/features/auth/screens/SplashScreen';
import { PermissionGateScreen } from '@/features/auth/screens/PermissionGateScreen';
import { LanguageScreen } from '@/features/auth/screens/LanguageScreen';
import { OnboardingScreen } from '@/features/auth/screens/OnboardingScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { VerifyEmailScreen } from '@/features/auth/screens/VerifyEmailScreen';
import { AppTabs } from './AppTabs';
import { CreateKhatmaStep1Screen } from '@/features/khatma/screens/CreateKhatmaStep1Screen';
import { CreateKhatmaStep2Screen } from '@/features/khatma/screens/CreateKhatmaStep2Screen';
import { JuzIndexScreen } from '@/features/quran/screens/JuzIndexScreen';
import { SurahIndexScreen } from '@/features/quran/screens/SurahIndexScreen';
import { QuranReaderScreen } from '@/features/quran/screens/QuranReaderScreen';
import { DhikrContentScreen } from '@/features/adhkar/screens/DhikrContentScreen';
import { PrayerLocationRequestScreen } from '@/features/prayer/screens/PrayerLocationRequestScreen';
import { PrayerLoadingScreen } from '@/features/prayer/screens/PrayerLoadingScreen';
import { PrayerLocationSuccessScreen } from '@/features/prayer/screens/PrayerLocationSuccessScreen';
import { PrayerSettingsScreen } from '@/features/prayer/screens/PrayerSettingsScreen';
import { QiblaScreen } from '@/features/qibla/screens/QiblaScreen';
import { RemindersScreen } from '@/features/reminders/screens/RemindersScreen';
import { AccountSyncScreen } from '@/features/more/screens/AccountSyncScreen';
import { MoreSettingsScreen } from '@/features/more/screens/MoreSettingsScreen';
import { LocationFailureScreen } from '@/features/prayer/screens/LocationFailureScreen';
import { ManualCityScreen } from '@/features/prayer/screens/ManualCityScreen';
import { SupportScreen } from '@/features/more/screens/SupportScreen';
import { RatingExperienceScreen } from '@/features/rating/RatingExperienceScreen';
import { useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabsGate: React.FC = () => <AppTabs />;

export const RootNavigator = () => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const theme = getThemeByMode(mode);

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        headerTintColor: theme.colors.neutral.textPrimary,
        headerStyle: {
          backgroundColor: theme.colors.neutral.surface,
        },
        headerTitleStyle: {
          color: theme.colors.neutral.textPrimary,
          fontWeight: '700',
          fontSize: 19,
        },
        contentStyle: {
          backgroundColor: theme.colors.neutral.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PermissionGate" component={PermissionGateScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ title: t('language.title'), headerBackVisible: false }}
      />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: t('onboarding.title') }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('auth.loginTitle') }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t('auth.registerTitle') }} />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: t('auth.forgotTitle') }}
      />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{ title: t('auth.verifyTitle') }} />
      <Stack.Screen name="MainTabs" component={MainTabsGate} options={{ headerShown: false }} />
      <Stack.Screen
        name="CreateKhatmaStep1"
        component={CreateKhatmaStep1Screen}
        options={{ title: t('khatma.create1Title') }}
      />
      <Stack.Screen
        name="CreateKhatmaStep2"
        component={CreateKhatmaStep2Screen}
        options={{ title: t('khatma.create2Title') }}
      />
      <Stack.Screen name="JuzIndex" component={JuzIndexScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SurahIndex" component={SurahIndexScreen} options={{ headerShown: false }} />
      <Stack.Screen name="QuranReader" component={QuranReaderScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DhikrContent" component={DhikrContentScreen} options={{ title: t('adhkar.content') }} />
      <Stack.Screen
        name="PrayerLocationRequest"
        component={PrayerLocationRequestScreen}
        options={{ title: t('prayer.requestLocation') }}
      />
      <Stack.Screen
        name="PrayerLoading"
        component={PrayerLoadingScreen}
        options={{ title: t('prayer.loading') }}
      />
      <Stack.Screen
        name="PrayerLocationSuccess"
        component={PrayerLocationSuccessScreen}
        options={{ title: t('prayer.success') }}
      />
      <Stack.Screen name="PrayerSettings" component={PrayerSettingsScreen} options={{ title: t('prayer.settings') }} />
      <Stack.Screen name="Qibla" component={QiblaScreen} options={{ title: t('qibla.title') }} />
      <Stack.Screen name="Reminders" component={RemindersScreen} options={{ title: t('reminders.title') }} />
      <Stack.Screen name="AccountSync" component={AccountSyncScreen} options={{ title: t('more.accountSync') }} />
      <Stack.Screen name="MoreSettings" component={MoreSettingsScreen} options={{ title: t('more.title') }} />
      <Stack.Screen
        name="LocationFailure"
        component={LocationFailureScreen}
        options={{ title: t('prayer.failure') }}
      />
      <Stack.Screen name="ManualCity" component={ManualCityScreen} options={{ title: t('prayer.manualCity') }} />
      <Stack.Screen name="Support" component={SupportScreen} options={{ title: t('support.title') }} />
      <Stack.Screen
        name="RatingExperience"
        component={RatingExperienceScreen}
        options={{ presentation: 'transparentModal', animation: 'fade', headerShown: false }}
      />
    </Stack.Navigator>
  );
};
