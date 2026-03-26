import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { useSettingsStore } from '@/state/settingsStore';
import { getTabBarTheme, tabBarSizes } from './tabBarTheme';
import { QuranTabIcon } from './QuranTabIcon';
import { QiblaTabIcon } from './QiblaTabIcon';
import { RosaryTabIcon } from './RosaryTabIcon';

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);
const AnimatedMaterialCommunityIcons = Animated.createAnimatedComponent(MaterialCommunityIcons);
const focusTransition = {
  duration: 280,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
} as const;

type TabIconSpec = {
  name: string;
  library?: 'ionicons' | 'materialCommunity' | 'custom';
};

type Props = {
  label: string;
  icon: TabIconSpec;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

export const TabButton: React.FC<Props> = ({
  label,
  icon,
  focused,
  onPress,
  onLongPress,
  testID,
  accessibilityLabel,
}) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const tabBarTheme = getTabBarTheme(mode);
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(focused ? 1 : 0, focusTransition);
  }, [focused, progress]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -4]) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.015]) },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.78, 1]),
    transform: [{ translateY: interpolate(progress.value, [0, 1], [1, -1]) }],
  }));

  const focusRailStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1]),
    transform: [{ scaleX: interpolate(progress.value, [0, 1], [0.5, 1]) }],
  }));

  const iconAnimatedProps = useAnimatedProps(
    () => ({
      color: interpolateColor(progress.value, [0, 1], [tabBarTheme.colors.inactive, tabBarTheme.colors.active]),
    }),
    [mode],
  );

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      android_ripple={{ color: 'rgba(255,255,255,0.12)', radius: 34, borderless: false }}
      style={styles.pressable}
    >
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <Animated.View style={styles.iconSlot}>
          {icon.library === 'custom' && icon.name === 'rosary' ? (
            <RosaryTabIcon
              color={focused ? tabBarTheme.colors.active : tabBarTheme.colors.inactive}
              size={23}
              focused={focused}
            />
          ) : icon.library === 'custom' && icon.name === 'qibla' ? (
            <QiblaTabIcon
              color={focused ? tabBarTheme.colors.active : tabBarTheme.colors.inactive}
              size={23}
              focused={focused}
            />
          ) : icon.library === 'custom' && icon.name === 'quran' ? (
            <QuranTabIcon
              color={focused ? tabBarTheme.colors.active : tabBarTheme.colors.inactive}
              size={23}
              focused={focused}
            />
          ) : icon.library === 'materialCommunity' ? (
            <AnimatedMaterialCommunityIcons
              animatedProps={iconAnimatedProps as never}
              name={icon.name as never}
              size={23}
            />
          ) : (
            <AnimatedIonicons animatedProps={iconAnimatedProps as never} name={icon.name as never} size={23} />
          )}
        </Animated.View>
        <Animated.View style={labelStyle}>
          <AppText
            variant="bodySm"
            style={[
              styles.label,
              { color: tabBarTheme.colors.inactive },
              focused && { color: tabBarTheme.colors.active },
            ]}
          >
            {label}
          </AppText>
        </Animated.View>
        <Animated.View
          style={[
            styles.focusRail,
            { backgroundColor: tabBarTheme.colors.active },
            focusRailStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
    maxWidth: tabBarSizes.sideButtonWidth,
    height: tabBarSizes.sideButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    height: tabBarSizes.sideButtonHeight,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconSlot: {
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusRail: {
    width: 18,
    height: 3,
    borderRadius: 999,
    marginTop: 1,
  },
  label: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
