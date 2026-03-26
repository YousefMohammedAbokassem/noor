import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { useSettingsStore } from '@/state/settingsStore';
import { getTabBarTheme, tabBarSizes } from './tabBarTheme';

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);
const AnimatedMaterialCommunityIcons = Animated.createAnimatedComponent(MaterialCommunityIcons);
const focusTransition = {
  duration: 300,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
} as const;

type TabIconSpec = {
  name: string;
  library?: 'ionicons' | 'materialCommunity' | 'custom';
};

type Props = {
  icon: TabIconSpec;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
};

export const CenterTabButton: React.FC<Props> = ({
  icon,
  label,
  focused,
  onPress,
  onLongPress,
  testID,
  accessibilityLabel,
}) => {
  const mode = useSettingsStore((s) => s.readerTheme);
  const tabBarTheme = getTabBarTheme(mode);
  const focusProgress = useSharedValue(focused ? 1 : 0);
  const pressProgress = useSharedValue(0);

  useEffect(() => {
    focusProgress.value = withTiming(focused ? 1 : 0, focusTransition);
  }, [focused, focusProgress]);

  const outerStyle = useAnimatedStyle(() => {
    const baseScale = interpolate(focusProgress.value, [0, 1], [1, 1.02]);
    const pressScale = interpolate(pressProgress.value, [0, 1], [0, 0.04]);
    return {
      transform: [
        {
          translateY: interpolate(
            focusProgress.value,
            [0, 1],
            [-tabBarSizes.centerButtonLift + 1, -tabBarSizes.centerButtonLift],
          ),
        },
        { scale: baseScale - pressScale },
      ],
      shadowOpacity: interpolate(focusProgress.value, [0, 1], [0.14, 0.22]),
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(focusProgress.value, [0, 1], [0.1, 0.22]),
    transform: [{ scale: interpolate(focusProgress.value, [0, 1], [0.96, 1.02]) }],
  }));

  const innerStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        [tabBarTheme.colors.centerInner, tabBarTheme.colors.centerInnerFocused],
      ),
    }),
    [mode],
  );

  const iconAnimatedProps = useAnimatedProps(
    () => ({
      color: tabBarTheme.colors.centerIcon,
    }),
    [mode],
  );

  return (
    <Animated.View style={[styles.container, outerStyle]}>
      <Animated.View style={[styles.glow, { backgroundColor: tabBarTheme.colors.centerGlow }, glowStyle]} />
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          pressProgress.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
        }}
        onPressOut={() => {
          pressProgress.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={accessibilityLabel ?? label}
        testID={testID}
        android_ripple={{ color: 'rgba(255,255,255,0.14)', radius: 36, borderless: false }}
        style={styles.pressable}
      >
        <View style={[styles.outerShell, { backgroundColor: tabBarTheme.colors.centerOuter }]}>
          <Animated.View style={[styles.inner, { borderColor: tabBarTheme.colors.centerRing }, innerStyle]}>
            {icon.library === 'materialCommunity' ? (
                <AnimatedMaterialCommunityIcons
                  animatedProps={iconAnimatedProps as never}
                  name={icon.name as never}
                  size={26}
                />
              ) : (
              <AnimatedIonicons animatedProps={iconAnimatedProps as never} name={icon.name as never} size={26} />
            )}
          </Animated.View>
        </View>
      </Pressable>
      <View style={[styles.pivot, { backgroundColor: tabBarTheme.colors.centerPivot }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: tabBarSizes.centerButton + 10,
    height: tabBarSizes.centerButton + 18,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
  },
  pressable: {
    borderRadius: 999,
  },
  glow: {
    position: 'absolute',
    top: 4,
    width: tabBarSizes.centerButton + 8,
    height: tabBarSizes.centerButton + 8,
    borderRadius: 999,
  },
  outerShell: {
    width: tabBarSizes.centerButton + 4,
    height: tabBarSizes.centerButton + 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: tabBarSizes.centerButton,
    height: tabBarSizes.centerButton,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pivot: {
    marginTop: 4,
    width: 18,
    height: 4,
    borderRadius: 99,
    opacity: 0.62,
  },
});
