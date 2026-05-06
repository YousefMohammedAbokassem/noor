import React from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from './types';
import { SplashScreen } from '@/features/auth/screens/SplashScreen';
import { PermissionGateScreen } from '@/features/auth/screens/PermissionGateScreen';
import { LanguageScreen } from '@/features/auth/screens/LanguageScreen';
import { OnboardingScreen } from '@/features/auth/screens/OnboardingScreen';
import { LoginScreen } from '@/features/auth/screens/LoginScreen';
import { RegisterScreen } from '@/features/auth/screens/RegisterScreen';
import { ForgotPasswordScreen } from '@/features/auth/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '@/features/auth/screens/ResetPasswordScreen';
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
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { adhkarCategories } from '@/constants/adhkar';
import { goBackSmart } from './goBackSmart';
import { notificationService } from '@/services/notificationService';
import { locationService } from '@/services/locationService';

const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabsGate: React.FC = () => {
  const navigation = useNavigation<any>();
  const [ready, setReady] = React.useState(false);

  const verifyRequiredPermissions = React.useCallback(
    async (options?: { keepReady?: boolean }) => {
      try {
        const [notificationGranted, locationGranted] = await Promise.all([
          notificationService.getPermissionStatus(),
          locationService.getPermissionStatus(),
        ]);

        if (!notificationGranted || !locationGranted) {
          setReady(false);
          navigation.replace('PermissionGate', { nextRoute: 'MainTabs' });
          return;
        }

        if (!options?.keepReady) {
          setReady(true);
        }
      } catch {
        setReady(false);
        navigation.replace('PermissionGate', { nextRoute: 'MainTabs' });
      }
    },
    [navigation],
  );

  React.useEffect(() => {
    void verifyRequiredPermissions();
  }, [verifyRequiredPermissions]);

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void verifyRequiredPermissions({ keepReady: true });
      }
    });

    return () => subscription.remove();
  }, [verifyRequiredPermissions]);

  return ready ? <AppTabs /> : null;
};

const adhkarHeaderIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  sun: 'sunny-outline',
  moon: 'moon-outline',
  bed: 'bed-outline',
  clock: 'time-outline',
  home: 'business-outline',
  book: 'book-outline',
  'book-open': 'bookmarks-outline',
  navigation: 'airplane-outline',
  shield: 'shield-checkmark-outline',
};

export const RootNavigator = () => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isRTL = language === 'ar';
  const headerAccentColor = mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.darkGreen;

  const buildDhikrFeatureIcon = (categoryId?: string) => {
    const category = adhkarCategories.find((item) => item.id === categoryId);
    const headerIcon = adhkarHeaderIconMap[category?.icon ?? 'book'] ?? 'sparkles-outline';

    return (
      <View
        key="feature"
        style={[
          styles.headerFeatureIcon,
          {
            backgroundColor: mode === 'dark' ? theme.colors.neutral.surfaceAlt : theme.colors.brand.mist,
            borderColor: mode === 'dark' ? theme.colors.neutral.borderStrong : theme.colors.brand.softGold,
          },
        ]}
      >
        <Ionicons
          name={headerIcon}
          size={18}
          color={mode === 'dark' ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}
        />
      </View>
    );
  };

  const renderHeaderTheme = () => <ThemeToggleButton key="theme" compact />;

  const renderHeaderBack = (navigation: {
    canGoBack?: () => boolean;
    goBack?: () => void;
    getParent?: () => unknown;
    getState?: () => unknown;
    navigate?: (name: string, params?: unknown) => void;
  }) => {
    if (!navigation.canGoBack?.()) {
      return null;
    }

    return (
      <Pressable
        key="back"
        accessibilityRole="button"
        accessibilityLabel="go-back"
        onPress={() => {
          goBackSmart(navigation);
        }}
        style={({ pressed }) => [
          styles.headerActionButton,
          {
            borderColor: theme.colors.neutral.border,
            backgroundColor: theme.colors.neutral.surface,
            opacity: pressed ? 0.86 : 1,
          },
        ]}
      >
        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={18} color={headerAccentColor} />
      </Pressable>
    );
  };

  const renderHeaderCluster = (items: React.ReactNode[]) => {
    const content = items.filter(Boolean);
    if (content.length === 0) return null;

    return <View style={[styles.headerCluster, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>{content}</View>;
  };

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={({ navigation, route }) => {
        const hideBack = route.name === 'Language';
        const backControl = hideBack ? null : renderHeaderBack(navigation);
        const extraUtilityControl =
          route.name === 'DhikrContent'
            ? buildDhikrFeatureIcon((route.params as { categoryId?: string } | undefined)?.categoryId)
            : null;
        const leftItems = isRTL
          ? [renderHeaderTheme(), extraUtilityControl]
          : [backControl];
        const rightItems = isRTL
          ? [backControl]
          : [extraUtilityControl, renderHeaderTheme()];

        return {
          headerShown: true,
          headerShadowVisible: false,
          headerBackTitleVisible: false,
          headerBackVisible: false,
          headerTintColor: theme.colors.neutral.textPrimary,
          headerStyle: {
            backgroundColor: theme.colors.neutral.surface,
          },
          headerTitleStyle: {
            color: theme.colors.neutral.textPrimary,
            fontWeight: '700',
            fontSize: 19,
          },
          headerTitleAlign: 'center',
          headerLeftContainerStyle: styles.headerSideInset,
          headerRightContainerStyle: styles.headerSideInset,
          headerLeft: () => renderHeaderCluster(leftItems),
          headerRight: () => renderHeaderCluster(rightItems),
          contentStyle: {
            backgroundColor: theme.colors.neutral.background,
          },
          animation: 'slide_from_right',
        };
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
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: t('auth.resetPasswordTitle') }}
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
      <Stack.Screen
        name="DhikrContent"
        component={DhikrContentScreen}
        options={{ title: t('adhkar.content') }}
      />
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
      <Stack.Screen
        name="MoreSettings"
        component={MoreSettingsScreen}
        options={{ title: t('more.title') }}
      />
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

const styles = StyleSheet.create({
  headerFeatureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center', 
    justifyContent: 'center',
  },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCluster: {
    alignItems: 'center',
    gap: 8,
  },
  headerSideInset: {
    paddingHorizontal: 8,
  },
});
