import React, { useContext, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomTabBarHeightCallbackContext from '@react-navigation/bottom-tabs/src/utils/BottomTabBarHeightCallbackContext';
import { TabButton } from './TabButton';
import { CenterTabButton } from './CenterTabButton';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getTabBarLayout, getTabBarTheme, tabBarSizes } from './tabBarTheme';

export type TabIconSpec = {
  name: string;
  library?: 'ionicons' | 'materialCommunity' | 'custom';
};

export type TabBarConfig = Record<
  string,
  {
    label: string;
    icon: TabIconSpec;
    center?: boolean;
  }
>;

type Props = BottomTabBarProps & {
  config: TabBarConfig;
  centerRouteName: string;
};

export const CustomTabBar: React.FC<Props> = ({
  state,
  descriptors,
  navigation,
  config,
  centerRouteName,
}) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const tabBarTheme = getTabBarTheme(mode);
  const isRTL = language === 'ar';
  const insets = useSafeAreaInsets();
  const setTabBarHeight = useContext(BottomTabBarHeightCallbackContext);
  const tabBarLayout = useMemo(() => getTabBarLayout(insets.bottom), [insets.bottom]);
  const centerIndex = state.routes.findIndex((route) => route.name === centerRouteName);

  const leftRoutes = useMemo(
    () => (centerIndex > -1 ? state.routes.slice(0, centerIndex) : state.routes),
    [centerIndex, state.routes],
  );
  const rightRoutes = useMemo(
    () => (centerIndex > -1 ? state.routes.slice(centerIndex + 1) : []),
    [centerIndex, state.routes],
  );
  const centerRoute = centerIndex > -1 ? state.routes[centerIndex] : undefined;

  useEffect(() => {
    setTabBarHeight?.(tabBarLayout.barHeight);
  }, [setTabBarHeight, tabBarLayout.barHeight]);

  const emitPressHandlers = (routeName: string, routeKey: string, focused: boolean) => {
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(routeName as never);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: 'tabLongPress',
        target: routeKey,
      });
    };

    return { onPress, onLongPress };
  };

  const renderSideButton = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((item) => item.key === route.key);
    const focused = state.index === index;
    const descriptor = descriptors[route.key];
    const routeConfig = config[route.name];
    const { onPress, onLongPress } = emitPressHandlers(route.name, route.key, focused);

    return (
      <TabButton
        key={route.key}
        label={routeConfig?.label ?? String(descriptor.options.tabBarLabel ?? descriptor.options.title ?? route.name)}
        icon={routeConfig?.icon ?? { name: 'ellipse-outline', library: 'ionicons' }}
        focused={focused}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
        testID={descriptor.options.tabBarTestID}
      />
    );
  };

  const centerButton = centerRoute
    ? (() => {
        const index = state.routes.findIndex((item) => item.key === centerRoute.key);
        const focused = state.index === index;
        const descriptor = descriptors[centerRoute.key];
        const routeConfig = config[centerRoute.name];
        const { onPress, onLongPress } = emitPressHandlers(centerRoute.name, centerRoute.key, focused);

        return (
          <CenterTabButton
            icon={routeConfig?.icon ?? { name: 'ellipse-outline', library: 'ionicons' }}
            label={routeConfig?.label ?? centerRoute.name}
            focused={focused}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
            testID={descriptor.options.tabBarTestID}
          />
        );
      })()
    : null;

  return (
    <View style={[styles.wrapper, { height: tabBarLayout.wrapperHeight }]}>
      <View
        style={[
          styles.bar,
          {
            paddingBottom: tabBarLayout.safeBottomInset,
            height: tabBarLayout.barHeight,
            backgroundColor: tabBarTheme.colors.bar,
            borderColor: tabBarTheme.colors.barBorder,
          },
        ]}
      >
        <View style={[styles.topLine, { backgroundColor: tabBarTheme.colors.barTopLine }]} />
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.sideGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {leftRoutes.map((route) => (
              <View key={`${route.key}-left`} style={styles.sideSlot}>
                {renderSideButton(route)}
              </View>
            ))}
          </View>
          <View style={styles.centerSpacer} />
          <View style={[styles.sideGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {rightRoutes.map((route) => (
              <View key={`${route.key}-right`} style={styles.sideSlot}>
                {renderSideButton(route)}
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.centerButtonWrap, { bottom: tabBarLayout.centerButtonBottom }]} pointerEvents="box-none">
        {centerButton}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    width: '100%',
    overflow: 'visible',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 14,
  },
  topLine: {
    height: 1.5,
    width: '84%',
    alignSelf: 'center',
    marginTop: 5,
    borderRadius: 999,
    opacity: 0.62,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sideSlot: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  centerSpacer: {
    width: tabBarSizes.centerButton + 24,
  },
  centerButtonWrap: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
