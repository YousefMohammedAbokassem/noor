import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import {
  TasbeehGeometry,
  getRosaryPointAtAngle,
} from '@/features/tasbeeh/utils/rosaryPath';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type RosaryGraphicProps = {
  geometry: TasbeehGeometry;
  currentAngles: SharedValue<number[]>;
  activeBeadIndex: SharedValue<number>;
  animationBeadIndex: SharedValue<number>;
  glowProgress: SharedValue<number>;
  onPress: () => void;
  progress: number;
  cycleCount: number;
  target: number;
  tapHint: string;
  cycleLabel: string;
  colors: {
    ring: string;
    darkHighlight: string;
    darkBase: string;
    darkShadow: string;
    lightHighlight: string;
    lightBase: string;
    lightShadow: string;
    sheen: string;
    activeRing: string;
    activeGlow: string;
    movingRing: string;
    movingGlow: string;
    hint: string;
    progressTrack: string;
    progressFill: string;
    progressLabel: string;
  };
};

type RosaryBeadProps = {
  beadId: number;
  geometry: TasbeehGeometry;
  currentAngles: SharedValue<number[]>;
  activeBeadIndex: SharedValue<number>;
  animationBeadIndex: SharedValue<number>;
  glowProgress: SharedValue<number>;
  colors: RosaryGraphicProps['colors'];
};

const RosaryBead = memo(
  ({
    beadId,
    geometry,
    currentAngles,
    activeBeadIndex,
    animationBeadIndex,
    glowProgress,
    colors,
  }: RosaryBeadProps) => {
    const size = geometry.beadSize;
    const palette = beadId % 2 === 0
      ? {
          highlight: colors.darkHighlight,
          base: colors.darkBase,
          shadow: colors.darkShadow,
        }
      : {
          highlight: colors.lightHighlight,
          base: colors.lightBase,
          shadow: colors.lightShadow,
        };

    const wrapStyle = useAnimatedStyle(() => {
      const angle = currentAngles.value[beadId] ?? geometry.baseAngles[beadId] ?? 0;
      const position = getRosaryPointAtAngle(angle, geometry);
      const isActive = activeBeadIndex.value === beadId;
      const isMoving = animationBeadIndex.value === beadId;

      return {
        transform: [
          { translateX: position.x - size / 2 },
          { translateY: position.y - size / 2 },
          {
            scale: isMoving
              ? interpolate(glowProgress.value, [0, 1], [1.03, 1.12])
              : isActive
                ? 1.05
                : 1,
          },
        ],
        zIndex: isMoving ? 5 : isActive ? 4 : 2,
      };
    }, [
      activeBeadIndex,
      animationBeadIndex,
      beadId,
      currentAngles,
      geometry,
      glowProgress,
      size,
    ]);

    const auraStyle = useAnimatedStyle(() => {
      const isActive = activeBeadIndex.value === beadId;
      const isMoving = animationBeadIndex.value === beadId;

      return {
        opacity: isMoving
          ? interpolate(glowProgress.value, [0, 1], [0.16, 0.42])
          : isActive
            ? 0.18
            : 0,
        borderColor: isMoving ? colors.movingRing : colors.activeRing,
        shadowColor: isMoving ? colors.movingGlow : colors.activeGlow,
        shadowOpacity: isMoving
          ? interpolate(glowProgress.value, [0, 1], [0.18, 0.34])
          : isActive
            ? 0.2
            : 0,
        shadowRadius: isMoving ? 16 : 10,
        transform: [
          {
            scale: isMoving
              ? interpolate(glowProgress.value, [0, 1], [1.08, 1.26])
              : isActive
                ? 1.13
                : 1,
          },
        ],
      };
    }, [
      activeBeadIndex,
      animationBeadIndex,
      beadId,
      colors.activeGlow,
      colors.activeRing,
      colors.movingGlow,
      colors.movingRing,
      glowProgress,
    ]);

    return (
      <Animated.View pointerEvents="none" style={[styles.beadWrap, { width: size, height: size }, wrapStyle]}>
        <Animated.View style={[styles.beadAura, auraStyle]} />

        <View
          style={[
            styles.bead,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: palette.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.beadRim,
              {
                borderRadius: size / 2,
                borderWidth: size * 0.05,
                borderColor: palette.highlight,
                opacity: 0.3,
              },
            ]}
          />

          <View
            style={[
              styles.beadCore,
              {
                width: size * 0.82,
                height: size * 0.82,
                borderRadius: size * 0.41,
                top: size * 0.09,
                left: size * 0.09,
                backgroundColor: palette.base,
              },
            ]}
          />

          <View
            style={[
              styles.beadShadow,
              {
                width: size * 0.86,
                height: size * 0.86,
                borderRadius: size * 0.43,
                right: -size * 0.04,
                bottom: -size * 0.06,
                backgroundColor: palette.shadow,
                opacity: 0.78,
              },
            ]}
          />

          <View
            style={[
              styles.beadInnerShade,
              {
                width: size * 0.7,
                height: size * 0.7,
                borderRadius: size * 0.35,
                right: size * 0.02,
                bottom: size * 0.04,
                backgroundColor: palette.shadow,
                opacity: 0.32,
              },
            ]}
          />

          <View
            style={[
              styles.beadHighlight,
              {
                width: size * 0.6,
                height: size * 0.42,
                borderRadius: size * 0.24,
                top: size * 0.1,
                left: size * 0.09,
                backgroundColor: palette.highlight,
                opacity: 0.94,
                transform: [{ rotate: '-18deg' }],
              },
            ]}
          />

          <View
            style={[
              styles.beadSheen,
              {
                width: size * 0.22,
                height: size * 0.22,
                borderRadius: size * 0.11,
                top: size * 0.18,
                left: size * 0.18,
                backgroundColor: colors.sheen,
              },
            ]}
          />

          <View
            style={[
              styles.beadSpecular,
              {
                width: size * 0.34,
                height: size * 0.08,
                borderRadius: size * 0.04,
                top: size * 0.28,
                left: size * 0.18,
                transform: [{ rotate: '-18deg' }],
              },
            ]}
          />
        </View>
      </Animated.View>
    );
  },
);

RosaryBead.displayName = 'RosaryBead';

export const RosaryGraphic = memo(
  ({
    geometry,
    currentAngles,
    activeBeadIndex,
    animationBeadIndex,
    glowProgress,
    onPress,
    progress,
    cycleCount,
    target,
    tapHint,
    cycleLabel,
    colors,
  }: RosaryGraphicProps) => (
    <AnimatedPressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
    >
      <View
        style={[
          styles.canvas,
          {
            width: geometry.canvasWidth,
            height: geometry.canvasHeight,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.drawingLayer,
            {
              transform: [{ rotate: `${geometry.rotationDeg}deg` }],
            },
          ]}
        >
          <View
            style={[
              styles.ring,
              {
                width: geometry.ringSize,
                height: geometry.ringHeight,
                borderRadius: 999,
                borderWidth: geometry.ringStrokeWidth,
                borderColor: colors.ring,
                left: geometry.centerX - geometry.ringSize / 2,
                top: geometry.centerY - geometry.ringHeight / 2,
              },
            ]}
          />

          {Array.from({ length: geometry.beadCount }, (_, beadId) => (
            <RosaryBead
              key={`bead-${beadId}`}
              beadId={beadId}
              geometry={geometry}
              currentAngles={currentAngles}
              activeBeadIndex={activeBeadIndex}
              animationBeadIndex={animationBeadIndex}
              glowProgress={glowProgress}
              colors={colors}
            />
          ))}
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressLabels}>
          <AppText variant="bodySm" color={colors.progressLabel}>
            {cycleLabel}
          </AppText>
          <AppText variant="bodySm" color={colors.progressFill}>
            {cycleCount}/{target}
          </AppText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.progressTrack }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: colors.progressFill,
              },
            ]}
          />
        </View>
      </View>

      {tapHint.trim().length > 0 ? (
        <AppText variant="bodySm" style={styles.tapHintText} color={colors.hint}>
          {tapHint}
        </AppText>
      ) : null}
    </AnimatedPressable>
  ),
);

RosaryGraphic.displayName = 'RosaryGraphic';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
    marginTop: -1,
  },
  containerPressed: {
    opacity: 0.985,
  },
  canvas: {
    position: 'relative',
    overflow: 'hidden',
    direction: 'ltr',
  },
  ring: {
    position: 'absolute',
    zIndex: 0,
  },
  drawingLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  beadWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beadAura: {
    position: 'absolute',
    top: -6,
    right: -6,
    bottom: -6,
    left: -6,
    borderRadius: 999,
    borderWidth: 1.6,
  },
  bead: {
    position: 'absolute',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  beadRim: {
    ...StyleSheet.absoluteFillObject,
  },
  beadCore: {
    position: 'absolute',
  },
  beadShadow: {
    position: 'absolute',
  },
  beadInnerShade: {
    position: 'absolute',
  },
  beadHighlight: {
    position: 'absolute',
  },
  beadSheen: {
    position: 'absolute',
  },
  beadSpecular: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  progressWrap: {
    width: '100%',
    gap: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  tapHintText: {
    textAlign: 'center',
  },
});
