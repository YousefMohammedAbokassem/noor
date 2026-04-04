import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { MainTabParamList } from './types';
import { HomeWirdScreen } from '@/features/khatma/screens/HomeWirdScreen';
import { AdhkarCategoriesScreen } from '@/features/adhkar/screens/AdhkarCategoriesScreen';
import { TasbeehScreen } from '@/features/tasbeeh/screens/TasbeehScreen';
import { CustomTabBar, TabBarConfig } from '@/navigation/tabbar/CustomTabBar';
import { QuranHomeScreen } from '@/features/quran/screens/QuranHomeScreen';
import { QiblaScreen } from '@/features/qibla/screens/QiblaScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const AppTabs = () => {
  const { t } = useTranslation();

  const tabConfig: TabBarConfig = {
    QuranHome: { label: t('quran.nav'), icon: { name: 'quran', library: 'custom' } },
    AdhkarCategories: { label: t('adhkar.categories'), icon: { name: 'bookmark-multiple-outline', library: 'materialCommunity' } },
    Tasbeeh: { label: t('tasbeeh.nav'), icon: { name: 'rosary', library: 'custom' }, center: true },
    Home: { label: t('home.title'), icon: { name: 'home-variant-outline', library: 'materialCommunity' } },
    QiblaTab: { label: t('qibla.title'), icon: { name: 'qibla', library: 'custom' } },
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      backBehavior="history"
      tabBar={(props) => <CustomTabBar {...props} config={tabConfig} centerRouteName="Home" />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="QuranHome" component={QuranHomeScreen} options={{ title: t('quran.nav'), tabBarLabel: t('quran.nav') }} />
      <Tab.Screen
        name="AdhkarCategories"
        component={AdhkarCategoriesScreen}
        options={{ title: t('adhkar.categories'), tabBarLabel: t('adhkar.categories') }}
      />
      <Tab.Screen name="Home" component={HomeWirdScreen} options={{ title: t('home.title'), tabBarLabel: t('home.title') }} />
      <Tab.Screen name="Tasbeeh" component={TasbeehScreen} options={{ title: t('tasbeeh.title'), tabBarLabel: t('tasbeeh.nav') }} />
      <Tab.Screen name="QiblaTab" component={QiblaScreen} options={{ title: t('qibla.title'), tabBarLabel: t('qibla.title') }} />
    </Tab.Navigator>
  );
};
