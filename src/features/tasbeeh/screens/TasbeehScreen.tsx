import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/Screen';
import { AppCard } from '@/components/ui/AppCard';
import { AppText } from '@/components/ui/AppText';
import { InlineBackThemeBar } from '@/components/ui/InlineBackThemeBar';
import { goBackSmart } from '@/navigation/goBackSmart';
import { RosaryGraphic } from '@/features/tasbeeh/components/RosaryGraphic';
import { useTasbeehRosaryAnimation } from '@/features/tasbeeh/hooks/useTasbeehRosaryAnimation';
import { buildTasbeehGeometry } from '@/features/tasbeeh/utils/rosaryPath';
import { getTabBarLayout } from '@/navigation/tabbar/tabBarTheme';
import { useTasbeehStore } from '@/state/tasbeehStore';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';

const ADHKAR = ['سبحان الله', 'الحمد لله', 'الله أكبر', 'لا إله إلا الله', 'أستغفر الله'];
const TARGET_OPTIONS = [33, 100, 300];

export const TasbeehScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const count = useTasbeehStore((s) => s.count);
  const target = useTasbeehStore((s) => s.target);
  const increment = useTasbeehStore((s) => s.increment);
  const reset = useTasbeehStore((s) => s.reset);
  const setTarget = useTasbeehStore((s) => s.setTarget);
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';
  const tabBarLayout = useMemo(() => getTabBarLayout(insets.bottom), [insets.bottom]);
  const reservedBottomSpace = Math.max(tabBarHeight, tabBarLayout.wrapperHeight);

  const [dhikrIndex, setDhikrIndex] = useState(0);
  const geometry = useMemo(() => {
    const availableSize = Math.min(width - 24, 360, height - reservedBottomSpace - insets.top - 320);
    const widthProgress = Math.max(0, Math.min(1, (availableSize - 280) / 80));

    return buildTasbeehGeometry(availableSize, {
      canvasHeight: Math.max(availableSize * (0.76 + widthProgress * 0.02), 264),
      ringScale: 1.4,
      ringHeightScale: 1,
      beadCount: 24,
      beadScale: 0.98,
      centerXRatio: 0.19,
      centerYRatio: 1.04 + widthProgress * 0.05,
      rotationDeg: 0,
      startAngle: 212,
      bigGap: 38,
      bigGapAfter: 6,
    });
  }, [height, insets.top, reservedBottomSpace, width]);

  const {
    currentAngles,
    activeBeadIndex,
    animationBeadIndex,
    glowProgress,
    counterAnimatedStyle,
    animateAdvance,
    animateReset,
  } = useTasbeehRosaryAnimation({
    count,
    baseAngles: geometry.baseAngles,
    beadCount: geometry.beadCount,
    followSpeed: geometry.followSpeed,
    stepDirection: 1,
  });

  const cycleCount = useMemo(() => {
    if (target <= 0) return count;
    const remainder = count % target;
    return count > 0 && remainder === 0 ? target : remainder;
  }, [count, target]);

  const remaining = useMemo(() => {
    if (target <= 0) return 0;
    if (count === 0) return target;
    const remainder = count % target;
    return remainder === 0 ? 0 : target - remainder;
  }, [count, target]);

  const progress = useMemo(() => {
    if (target <= 0) return 0;
    return Math.min(cycleCount / target, 1);
  }, [cycleCount, target]);

  const rounds = useMemo(() => {
    if (target <= 0) return 0;
    return Math.floor(count / target);
  }, [count, target]);

  const rosaryColors = useMemo(
    () => ({
      thread: theme.colors.brand.softGold,
      ring: theme.colors.brand.softGold,
      darkHighlight: '#F4E6B9',
      darkBase: theme.colors.brand.gold,
      darkShadow: '#8B6722',
      lightHighlight: '#FFF7DE',
      lightBase: '#E8D29A',
      lightShadow: '#B99136',
      sheen: 'rgba(255,255,255,0.26)',
      activeRing: 'rgba(231,206,134,0.2)',
      activeGlow: 'rgba(201,166,70,0.34)',
      movingRing: 'rgba(255,247,222,0.18)',
      movingGlow: 'rgba(231,206,134,0.48)',
      hint: '#D7C89A',
      progressTrack: 'rgba(255,255,255,0.08)',
      progressFill: theme.colors.brand.softGold,
      progressLabel: '#E7D9AF',
    }),
    [
      theme.colors.brand.gold,
      theme.colors.brand.softGold,
    ],
  );

  const runTapFeedback = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Best effort only.
    }
  }, []);

  const onTap = useCallback(() => {
    const nextCount = count + 1;
    animateAdvance(nextCount);
    increment();
    void runTapFeedback();
  }, [animateAdvance, count, increment, runTapFeedback]);

  const onReset = useCallback(() => {
    animateReset(0);
    reset();
  }, [animateReset, reset]);

  const goBack = useCallback(() => {
    goBackSmart(navigation);
  }, [navigation]);

  return (
    <Screen
      showDecorations={false}
      showThemeToggle={false}
      contentStyle={[
        styles.content,
        { paddingBottom: reservedBottomSpace + 24 },
      ]}
    >
      <InlineBackThemeBar onBack={goBack} />

      <View
        style={[
          styles.shell,
          {
            backgroundColor: isDark ? '#0F1D19' : '#113126',
          },
        ]}
      >
        <View style={[styles.topBar, isRTL && styles.rowReverse]}>
          <Pressable
            onPress={() => setDhikrIndex((current) => (current - 1 + ADHKAR.length) % ADHKAR.length)}
            style={({ pressed }) => [
              styles.navButtonCompact,
              {
                borderColor: 'rgba(231, 206, 134, 0.2)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={16} color={theme.colors.brand.softGold} />
            <AppText variant="bodySm" style={styles.navButtonTextCompact} color="#D9E4DE">
              {t('tasbeeh.previousDhikr')}
            </AppText>
          </Pressable>

          <Pressable
            onPress={onReset}
            style={({ pressed }) => [
              styles.resetPillCompact,
              {
                borderColor: theme.colors.brand.gold,
                backgroundColor: pressed ? 'rgba(201, 166, 70, 0.14)' : 'rgba(201, 166, 70, 0.08)',
              },
            ]}
          >
            <Ionicons name="refresh" size={16} color={theme.colors.brand.gold} />
          </Pressable>

          <Pressable
            onPress={() => setDhikrIndex((current) => (current + 1) % ADHKAR.length)}
            style={({ pressed }) => [
              styles.navButtonCompact,
              {
                borderColor: 'rgba(231, 206, 134, 0.2)',
                backgroundColor: 'rgba(255,255,255,0.03)',
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <AppText variant="bodySm" style={styles.navButtonTextCompact} color="#D9E4DE">
              {t('tasbeeh.nextDhikr')}
            </AppText>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.brand.softGold} />
          </Pressable>
        </View>

        <AppCard
          style={[
            styles.dhikrCard,
            {
              backgroundColor: isDark ? '#173226' : '#194033',
              borderColor: 'rgba(231, 206, 134, 0.14)',
            },
          ]}
        >
          <AppText variant="headingMd" style={styles.dhikrText} color={theme.colors.brand.softGold}>
            {ADHKAR[dhikrIndex]}
          </AppText>

          <View style={styles.dhikrMetaRow}>
            <View style={styles.metaItem}>
              <AppText variant="bodySm" color="#D4E2DA">
                {t('tasbeeh.overallCount')}
              </AppText>
              <AppText variant="bodyMd" color="#FFFFFF">
                {count}
              </AppText>
            </View>

            <View
              style={[
                styles.targetBubble,
                {
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(231, 206, 134, 0.18)',
                },
              ]}
            >
              <AppText variant="bodySm" color={theme.colors.brand.softGold}>
                {target}
              </AppText>
            </View>

            <View style={styles.metaItem}>
              <AppText variant="bodySm" color="#D4E2DA">
                {t('tasbeeh.rounds')}
              </AppText>
              <AppText variant="bodyMd" color="#FFFFFF">
                {rounds}
              </AppText>
            </View>
          </View>
        </AppCard>

        <Animated.View style={[styles.counterWrap, counterAnimatedStyle]}>
          <AppText variant="headingLg" style={styles.counterText} color="#FFFFFF">
            {count}
          </AppText>
          <AppText variant="bodySm" color="#AFC1B8">
            {remaining === 0 ? t('tasbeeh.completedTarget') : t('tasbeeh.remainingToTarget', { count: remaining })}
          </AppText>
        </Animated.View>

        <RosaryGraphic
          geometry={geometry}
          currentAngles={currentAngles}
          activeBeadIndex={activeBeadIndex}
          animationBeadIndex={animationBeadIndex}
          glowProgress={glowProgress}
          onPress={onTap}
          progress={progress}
          cycleCount={cycleCount}
          target={target}
          tapHint=""
          cycleLabel={t('tasbeeh.cycleProgress')}
          colors={rosaryColors}
        />

        <View style={styles.targetsBlock}>
          <AppText variant="bodySm" color="#C9D8D0">
            {t('tasbeeh.chooseTarget')}
          </AppText>
          <View style={[styles.targetRow, isRTL && styles.rowReverse]}>
            {TARGET_OPTIONS.map((option) => {
              const selected = target === option;
              return (
                <Pressable
                  key={`target-${option}`}
                  onPress={() => setTarget(option)}
                  style={({ pressed }) => [
                    styles.targetButton,
                    {
                      backgroundColor: selected ? theme.colors.brand.green : 'rgba(255,255,255,0.04)',
                      borderColor: selected ? theme.colors.brand.softGold : 'rgba(255,255,255,0.08)',
                      opacity: pressed ? 0.84 : 1,
                    },
                  ]}
                >
                  <AppText variant="button" color={selected ? '#FFFFFF' : '#DCE7E1'}>
                    {option}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  shell: {
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 18,
    overflow: 'hidden',
    gap: 10,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  navButtonCompact: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navButtonTextCompact: {
    textAlign: 'center',
    flexShrink: 1,
  },
  resetPillCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dhikrCard: {
    gap: 8,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dhikrText: {
    textAlign: 'center',
    fontSize: 25,
    lineHeight: 32,
  },
  dhikrMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  targetBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  counterWrap: {
    alignItems: 'center',
    gap: 4,
  },
  counterText: {
    textAlign: 'center',
    fontSize: 92,
    lineHeight: 98,
    letterSpacing: 2,
    fontFamily: 'Courier',
    fontVariant: ['tabular-nums'],
  },
  targetsBlock: {
    gap: 10,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  targetButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
});
