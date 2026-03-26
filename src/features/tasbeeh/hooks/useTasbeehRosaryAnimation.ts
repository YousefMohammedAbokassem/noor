import { useCallback, useEffect, useRef } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  getAnglesForStep,
  shortestAngleDelta,
} from '@/features/tasbeeh/utils/rosaryPath';

type Params = {
  count: number;
  baseAngles: number[];
  beadCount: number;
  followSpeed: number;
  stepDirection?: 1 | -1;
};

const normalizeIndex = (value: number, beadCount: number) =>
  ((value % beadCount) + beadCount) % beadCount;

export const useTasbeehRosaryAnimation = ({
  count,
  baseAngles,
  beadCount,
  followSpeed,
  stepDirection = -1,
}: Params) => {
  const lastSyncedCountRef = useRef(count);
  const targetStep = useSharedValue(count);
  const currentAngles = useSharedValue(getAnglesForStep(count, baseAngles, beadCount, stepDirection));
  const activeBeadIndex = useSharedValue(normalizeIndex(count, beadCount));
  const animationBeadIndex = useSharedValue(normalizeIndex(count - 1, beadCount));
  const counterScale = useSharedValue(1);
  const glowProgress = useSharedValue(0);

  useEffect(() => {
    if (count === lastSyncedCountRef.current) {
      return;
    }

    lastSyncedCountRef.current = count;
    targetStep.value = count;
    currentAngles.value = getAnglesForStep(count, baseAngles, beadCount, stepDirection);
    activeBeadIndex.value = normalizeIndex(count, beadCount);
    animationBeadIndex.value = normalizeIndex(count - 1, beadCount);
    counterScale.value = 1;
    glowProgress.value = 0;
  }, [
    activeBeadIndex,
    animationBeadIndex,
    baseAngles,
    beadCount,
    count,
    counterScale,
    currentAngles,
    glowProgress,
    stepDirection,
    targetStep,
  ]);

  useFrameCallback(() => {
    const targetAngles = getAnglesForStep(targetStep.value, baseAngles, beadCount, stepDirection);
    const nextAngles = currentAngles.value.slice();
    let hasPendingMotion = false;

    for (let index = 0; index < beadCount; index += 1) {
      const currentAngle = nextAngles[index] ?? targetAngles[index];
      const delta = shortestAngleDelta(currentAngle, targetAngles[index]);

      if (Math.abs(delta) <= 0.01) {
        if (currentAngle !== targetAngles[index]) {
          nextAngles[index] = targetAngles[index];
          hasPendingMotion = true;
        }
        continue;
      }

      nextAngles[index] = currentAngle + delta * followSpeed;
      hasPendingMotion = true;
    }

    if (hasPendingMotion) {
      currentAngles.value = nextAngles;
    }
  });

  const animateTapFeedback = useCallback(() => {
    counterScale.value = 1;
    counterScale.value = withTiming(1.045, {
      duration: 95,
      easing: Easing.out(Easing.quad),
    }, (finished) => {
      if (!finished) {
        return;
      }

      counterScale.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    });

    glowProgress.value = 0;
    glowProgress.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    }, (finished) => {
      if (!finished) {
        return;
      }

      glowProgress.value = withTiming(0, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
      });
    });
  }, [counterScale, glowProgress]);

  const animateAdvance = useCallback((nextCount: number) => {
    lastSyncedCountRef.current = nextCount;

    const movingIndex = normalizeIndex(targetStep.value, beadCount);
    const nextStep = targetStep.value + 1;

    animationBeadIndex.value = movingIndex;
    targetStep.value = nextStep;
    activeBeadIndex.value = normalizeIndex(nextStep, beadCount);
    animateTapFeedback();
  }, [activeBeadIndex, animateTapFeedback, animationBeadIndex, beadCount, targetStep]);

  const animateReset = useCallback((nextCount = 0) => {
    lastSyncedCountRef.current = nextCount;
    targetStep.value = nextCount;
    currentAngles.value = getAnglesForStep(nextCount, baseAngles, beadCount, stepDirection);
    activeBeadIndex.value = normalizeIndex(nextCount, beadCount);
    animationBeadIndex.value = normalizeIndex(nextCount - 1, beadCount);
    counterScale.value = withTiming(1, { duration: 120 });
    glowProgress.value = withTiming(0, { duration: 120 });
  }, [
    activeBeadIndex,
    animationBeadIndex,
    baseAngles,
    beadCount,
    counterScale,
    currentAngles,
    glowProgress,
    stepDirection,
    targetStep,
  ]);

  const counterAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  return {
    currentAngles,
    activeBeadIndex,
    animationBeadIndex,
    glowProgress,
    counterAnimatedStyle,
    animateAdvance,
    animateReset,
  };
};

export type TasbeehRosaryAnimation = ReturnType<typeof useTasbeehRosaryAnimation>;
