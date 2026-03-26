import React from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { releaseCapture } from 'react-native-view-shot';
import { ThemeTransitionState, useSettingsStore } from '@/state/settingsStore';
import { getThemeByMode } from '@/theme';

const HOLE_DIAMETER = 42;

const resolveRevealScale = (width: number, height: number) =>
  Math.max(18, (Math.hypot(width, height) * 2.15) / HOLE_DIAMETER);

const resolveMaskBorder = (width: number, height: number) =>
  Math.ceil(Math.max(width, height) * 2.2);

export const ThemeTransitionOverlay: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const transition = useSettingsStore((s) => s.themeTransition);
  const [activeTransition, setActiveTransition] = React.useState<ThemeTransitionState | null>(null);
  const progress = React.useRef(new Animated.Value(0)).current;
  const animationRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const runIdRef = React.useRef(0);
  const capturedUriRef = React.useRef<string | null>(null);

  const releaseSnapshot = React.useCallback((uri: string | null) => {
    if (!uri) return;
    try {
      releaseCapture(uri);
    } catch {
      // Ignore release errors; temp files are cleaned by OS anyway.
    }
  }, []);

  React.useEffect(() => {
    if (transition.id === 0 || !transition.snapshotUri) return;

    if (capturedUriRef.current && capturedUriRef.current !== transition.snapshotUri) {
      releaseSnapshot(capturedUriRef.current);
    }
    capturedUriRef.current = transition.snapshotUri;

    setActiveTransition(transition);
    progress.setValue(0);

    animationRef.current?.stop();
    runIdRef.current += 1;
    const runId = runIdRef.current;

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animationRef.current = animation;
    animation.start(() => {
      if (runIdRef.current !== runId) return;
      setActiveTransition(null);
      releaseSnapshot(capturedUriRef.current);
      capturedUriRef.current = null;
    });
  }, [progress, releaseSnapshot, transition]);

  React.useEffect(
    () => () => {
      animationRef.current?.stop();
      releaseSnapshot(capturedUriRef.current);
      capturedUriRef.current = null;
    },
    [releaseSnapshot],
  );

  if (!activeTransition || !activeTransition.snapshotUri) {
    return null;
  }

  const nextTheme = getThemeByMode(activeTransition.toTheme);
  const revealScale = resolveRevealScale(width, height);
  const maskBorder = resolveMaskBorder(width, height);

  const holeScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.08, revealScale],
  });
  const snapshotOpacity = progress.interpolate({
    inputRange: [0, 0.88, 1],
    outputRange: [1, 1, 0],
  });
  const ringScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, revealScale * 0.7],
  });
  const ringOpacity = progress.interpolate({
    inputRange: [0, 0.65, 1],
    outputRange: [0.3, 0.12, 0],
  });

  const cutoutLeft = activeTransition.originX - HOLE_DIAMETER / 2 - maskBorder;
  const cutoutTop = activeTransition.originY - HOLE_DIAMETER / 2 - maskBorder;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <MaskedView
        style={styles.overlay}
        androidRenderingMode="software"
        maskElement={
          <View style={styles.maskRoot}>
            <Animated.View
              style={[
                styles.maskCutout,
                {
                  left: cutoutLeft,
                  top: cutoutTop,
                  borderWidth: maskBorder,
                  transform: [{ scale: holeScale }],
                },
              ]}
            />
          </View>
        }
      >
        <Animated.Image
          source={{ uri: activeTransition.snapshotUri }}
          resizeMode="cover"
          style={[styles.fullscreenLayer, { opacity: snapshotOpacity }]}
        />
      </MaskedView>

      <Animated.View
        style={[
          styles.revealRing,
          {
            left: activeTransition.originX - HOLE_DIAMETER / 2,
            top: activeTransition.originY - HOLE_DIAMETER / 2,
            borderColor: nextTheme.colors.brand.softGold,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  fullscreenLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  maskRoot: {
    ...StyleSheet.absoluteFillObject,
  },
  maskCutout: {
    position: 'absolute',
    width: HOLE_DIAMETER,
    height: HOLE_DIAMETER,
    borderRadius: HOLE_DIAMETER / 2,
    borderColor: '#000000',
    backgroundColor: 'transparent',
  },
  revealRing: {
    position: 'absolute',
    width: HOLE_DIAMETER,
    height: HOLE_DIAMETER,
    borderRadius: HOLE_DIAMETER / 2,
    borderWidth: 1.5,
  },
});
