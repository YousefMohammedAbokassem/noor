import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDevice } from 'expo-device';
import { Magnetometer } from 'expo-sensors';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { InlineBackThemeBar } from '@/components/ui/InlineBackThemeBar';
import { ErrorState } from '@/components/states/ErrorState';
import { locationService } from '@/services/locationService';
import { qiblaService } from '@/services/qiblaService';
import { goBackSmart } from '@/navigation/goBackSmart';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';

const normalize = (value: number) => {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

const headingFromSensor = (x: number, y: number) => {
  const angle = (Math.atan2(y, x) * 180) / Math.PI;
  return normalize(angle + 90);
};

export const QiblaScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';
  const showInlineTopBar = route.name === 'QiblaTab';

  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [sensorError, setSensorError] = useState('');

  const applySmoothHeading = useCallback((nextHeading: number) => {
    setHeading((prev) => {
      const next = normalize(nextHeading);
      const shortest = ((next - prev + 540) % 360) - 180;
      return normalize(prev + shortest * 0.34);
    });
  }, []);

  const loadQibla = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setLocationError('');
    try {
      const granted = await locationService.requestPermission();
      if (!granted) {
        setQiblaAngle(null);
        setLocationError(t('qibla.permissionRequired'));
        return false;
      }

      const loc = await locationService.getCurrentLocation();
      const angle = qiblaService.getQiblaDirection(loc.coords.latitude, loc.coords.longitude);
      setQiblaAngle(angle);
      return true;
    } catch {
      setQiblaAngle(null);
      setLocationError(t('qibla.locationFailed'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadQibla();
    }, [loadQibla]),
  );

  useFocusEffect(
    useCallback(() => {
      let magnetometerSub: { remove: () => void } | null = null;
      let headingSub: { remove: () => void } | null = null;
      let mounted = true;

      const startSensors = async () => {
        if (!isDevice) {
          setSensorError(t('qibla.simulatorSensorHint'));
          return;
        }

        try {
          headingSub = await locationService.watchHeading((value) => {
            applySmoothHeading(value);
          });
        } catch {
          try {
            Magnetometer.setUpdateInterval(150);
            magnetometerSub = Magnetometer.addListener((event) => {
              applySmoothHeading(headingFromSensor(event.x, event.y));
            });
          } catch {
            if (!mounted) return;
            setSensorError(t('qibla.sensorFailed'));
          }
        }
      };

      setSensorError('');
      void startSensors();

      return () => {
        mounted = false;
        headingSub?.remove();
        magnetometerSub?.remove();
      };
    }, [applySmoothHeading, t]),
  );

  const delta = useMemo(() => {
    if (qiblaAngle === null) return null;
    return normalize(qiblaAngle - heading);
  }, [heading, qiblaAngle]);

  const offsetFromQibla = useMemo(() => {
    if (delta === null) return null;
    return Math.min(delta, 360 - delta);
  }, [delta]);

  const alignmentMessage = useMemo(() => {
    if (offsetFromQibla === null) return t('qibla.alignStart');
    if (offsetFromQibla <= 6) return t('qibla.aligned');
    if (offsetFromQibla <= 15) return t('qibla.nearlyAligned');
    return t('qibla.keepTurning');
  }, [offsetFromQibla, t]);

  const hasReadyQibla = qiblaAngle !== null;
  const shouldShowBlockingError = !!locationError && !hasReadyQibla;

  const goBack = useCallback(() => {
    goBackSmart(navigation);
  }, [navigation]);

  return (
    <Screen showDecorations={false} showThemeToggle={false} contentStyle={styles.content}>
      {showInlineTopBar && (
        <InlineBackThemeBar onBack={goBack} />
      )}

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator
            size="large"
            color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}
          />
          <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary}>
            {t('qibla.loading')}
          </AppText>
        </View>
      ) : shouldShowBlockingError ? (
        <ErrorState title={t('qibla.errorTitle')} description={locationError} onRetry={() => void loadQibla()} />
      ) : (
        <>
          {!!sensorError && <ErrorState title={t('qibla.errorTitle')} description={sensorError} />}

          <AppCard
            style={[styles.metricsCard, { backgroundColor: theme.colors.brand.darkGreen, borderColor: theme.colors.brand.green }]}
          >
            <View style={[styles.metricsRow, isRTL && styles.rowReverse]}>
              <View style={styles.metricPill}>
                <AppText variant="bodySm" color="#C5DACF" style={styles.metricLabel}>
                  {t('qibla.phoneHeading')}
                </AppText>
                <AppText variant="headingSm" color={theme.colors.brand.softGold} style={styles.metricValue}>
                  {Math.round(heading)}°
                </AppText>
              </View>
              <View style={styles.metricPill}>
                <AppText variant="bodySm" color="#C5DACF" style={styles.metricLabel}>
                  {t('qibla.degree')}
                </AppText>
                <AppText variant="headingSm" color={theme.colors.brand.softGold} style={styles.metricValue}>
                  {hasReadyQibla ? `${Math.round(qiblaAngle)}°` : '--'}
                </AppText>
              </View>
              <View style={styles.metricPill}>
                <AppText variant="bodySm" color="#C5DACF" style={styles.metricLabel}>
                  {t('qibla.delta')}
                </AppText>
                <AppText variant="headingSm" color={theme.colors.brand.softGold} style={styles.metricValue}>
                  {delta !== null ? `${Math.round(delta)}°` : '--'}
                </AppText>
              </View>
            </View>
            <View style={styles.messageBanner}>
              <AppText variant="bodySm" color="#F7E5B2" style={styles.messageText}>
                {alignmentMessage}
              </AppText>
            </View>
          </AppCard>

          <View
            style={[
              styles.compassCard,
              {
                borderColor: theme.colors.neutral.borderStrong,
                backgroundColor: isDark ? '#10271E' : '#EDF5EF',
              },
            ]}
          >
            <AppText variant="headingSm" color={isDark ? theme.colors.brand.softGold : theme.colors.brand.darkGreen}>
              {t('qibla.title')}
            </AppText>

            <View style={[styles.compassVisual, { borderColor: theme.colors.neutral.borderStrong }]}>
              <View style={styles.axisHorizontal} />
              <View style={styles.axisVertical} />

              <View style={[styles.outerTick, styles.tickTop]} />
              <View style={[styles.outerTick, styles.tickBottom]} />
              <View style={[styles.outerTick, styles.tickLeft]} />
              <View style={[styles.outerTick, styles.tickRight]} />

              {delta !== null ? (
                <View style={[styles.qiblaOrbit, { transform: [{ rotate: `${delta}deg` }] }]}>
                  <View style={[styles.qiblaNeedle, { backgroundColor: theme.colors.brand.gold }]} />
                  <View style={[styles.kaabaBody, { borderColor: theme.colors.brand.gold }]}>
                    <View style={[styles.kaabaBand, { backgroundColor: theme.colors.brand.softGold }]} />
                    <View style={[styles.kaabaDoor, { backgroundColor: '#D3A53C' }]} />
                  </View>
                </View>
              ) : null}

              <View style={[styles.centerRing, { borderColor: theme.colors.brand.gold }]}>
                <View style={[styles.centerDot, { backgroundColor: theme.colors.brand.softGold }]} />
              </View>
            </View>

            <AppText variant="bodyMd" color={theme.colors.neutral.textSecondary} style={styles.compassHint}>
              {t('qibla.hint')}
            </AppText>
          </View>

          <AppButton title={t('qibla.recalibrate')} onPress={() => void loadQibla()} variant="ghost" />
        </>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingTop: 8,
    paddingBottom: 20,
    gap: 10,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  metricsCard: {
    gap: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  metricPill: {
    flex: 1,
    minHeight: 74,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(231,206,134,0.32)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  metricLabel: {
    textAlign: 'center',
  },
  metricValue: {
    textAlign: 'center',
    fontSize: 22,
    lineHeight: 28,
  },
  messageBanner: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(231,206,134,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(231,206,134,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  messageText: {
    textAlign: 'center',
  },
  compassCard: {
    minHeight: 320,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  compassVisual: {
    width: 258,
    height: 258,
    borderRadius: 129,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  axisHorizontal: {
    position: 'absolute',
    width: 210,
    height: 1,
    backgroundColor: 'rgba(166,180,170,0.45)',
  },
  axisVertical: {
    position: 'absolute',
    width: 1,
    height: 210,
    backgroundColor: 'rgba(166,180,170,0.45)',
  },
  outerTick: {
    position: 'absolute',
    width: 20,
    height: 2,
    backgroundColor: 'rgba(180,193,184,0.6)',
  },
  tickTop: {
    top: 10,
    transform: [{ rotate: '90deg' }],
  },
  tickBottom: {
    bottom: 10,
    transform: [{ rotate: '90deg' }],
  },
  tickLeft: {
    left: 10,
  },
  tickRight: {
    right: 10,
  },
  qiblaOrbit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qiblaNeedle: {
    position: 'absolute',
    width: 3,
    height: 96,
    borderRadius: 2,
    transform: [{ translateY: -48 }],
    opacity: 0.86,
  },
  kaabaBody: {
    position: 'absolute',
    top: 14,
    width: 34,
    height: 34,
    borderRadius: 7,
    borderWidth: 1.5,
    backgroundColor: '#141414',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  kaabaBand: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    height: 6,
  },
  kaabaDoor: {
    width: 8,
    height: 11,
    marginBottom: 4,
    borderRadius: 2,
  },
  centerRing: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  centerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  compassHint: {
    textAlign: 'center',
  },
});
