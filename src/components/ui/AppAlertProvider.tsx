import React from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/state/settingsStore';
import { useAuthStore } from '@/state/authStore';
import { getThemeByMode } from '@/theme';
import { AppText } from './AppText';

export type AppAlertAction = {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
};

type ToastOptions = {
  title?: string;
  durationMs?: number;
};

type AppAlertContextValue = {
  showAlert: (title: string, message?: string, actions?: AppAlertAction[]) => void;
  showToast: (message: string, options?: ToastOptions) => void;
  dismissAlert: () => void;
};

type AlertPayload = {
  title: string;
  message?: string;
  actions: AppAlertAction[];
};

type ToastPayload = {
  id: number;
  title?: string;
  message: string;
};

const DEFAULT_TOAST_DURATION_MS = 2200;

const AppAlertContext = React.createContext<AppAlertContextValue | null>(null);

export const AppAlertProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { t } = useTranslation();
  const mode = useSettingsStore((s) => s.readerTheme);
  const language = useAuthStore((s) => s.language);
  const theme = getThemeByMode(mode);
  const isDark = mode === 'dark';
  const isRTL = language === 'ar';

  const alertQueueRef = React.useRef<AlertPayload[]>([]);
  const toastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastIdRef = React.useRef(0);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;
  const toastTranslateY = React.useRef(new Animated.Value(-8)).current;

  const [activeAlert, setActiveAlert] = React.useState<AlertPayload | null>(null);
  const [activeToast, setActiveToast] = React.useState<ToastPayload | null>(null);

  const dismissAlert = React.useCallback(() => {
    setActiveAlert(alertQueueRef.current.shift() ?? null);
  }, []);

  const showAlert = React.useCallback<AppAlertContextValue['showAlert']>(
    (title, message, actions) => {
      const nextAlert: AlertPayload = {
        title,
        message,
        actions: actions?.length ? actions : [{ text: t('common.done') }],
      };

      setActiveAlert((current) => {
        if (current) {
          alertQueueRef.current.push(nextAlert);
          return current;
        }

        return nextAlert;
      });
    },
    [t],
  );

  const hideToast = React.useCallback(() => {
    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: -8,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setActiveToast((current) => {
          if (!current) return null;
          return current.id === toastIdRef.current ? null : current;
        });
      }
    });
  }, [toastOpacity, toastTranslateY]);

  const showToast = React.useCallback<AppAlertContextValue['showToast']>(
    (message, options) => {
      toastIdRef.current += 1;
      const nextToastId = toastIdRef.current;

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      setActiveToast({
        id: nextToastId,
        title: options?.title,
        message,
      });

      toastOpacity.stopAnimation();
      toastTranslateY.stopAnimation();
      toastOpacity.setValue(0);
      toastTranslateY.setValue(-8);

      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      toastTimerRef.current = setTimeout(() => {
        if (nextToastId !== toastIdRef.current) return;
        hideToast();
      }, options?.durationMs ?? DEFAULT_TOAST_DURATION_MS);
    },
    [hideToast, toastOpacity, toastTranslateY],
  );

  React.useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleActionPress = React.useCallback(
    (action: AppAlertAction) => {
      dismissAlert();
      if (action.onPress) {
        void Promise.resolve(action.onPress());
      }
    },
    [dismissAlert],
  );

  const contextValue = React.useMemo<AppAlertContextValue>(
    () => ({
      showAlert,
      showToast,
      dismissAlert,
    }),
    [dismissAlert, showAlert, showToast],
  );

  return (
    <AppAlertContext.Provider value={contextValue}>
      <View style={styles.root}>
        {children}

        {!!activeToast && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toastWrap,
              {
                opacity: toastOpacity,
                transform: [{ translateY: toastTranslateY }],
              },
            ]}
          >
            <View
              style={[
                styles.toastCard,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: isDark ? theme.colors.neutral.surface : theme.colors.neutral.backgroundElevated,
                  borderColor: isDark ? theme.colors.neutral.borderStrong : theme.colors.brand.softGold,
                  shadowOpacity: isDark ? 0.32 : 0.16,
                },
              ]}
            >
              <View
                style={[
                  styles.toastIcon,
                  {
                    backgroundColor: isDark ? 'rgba(231, 206, 134, 0.16)' : 'rgba(201, 166, 70, 0.16)',
                  },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={isDark ? theme.colors.brand.softGold : theme.colors.brand.gold}
                />
              </View>

              <View style={styles.toastTextWrap}>
                {!!activeToast.title && (
                  <AppText variant="label" numberOfLines={1}>
                    {activeToast.title}
                  </AppText>
                )}
                <AppText
                  variant="bodySm"
                  color={theme.colors.neutral.textSecondary}
                  numberOfLines={3}
                >
                  {activeToast.message}
                </AppText>
              </View>
            </View>
          </Animated.View>
        )}

        <Modal
          visible={!!activeAlert}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={dismissAlert}
        >
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={dismissAlert} />
            <View
              style={[
                styles.alertCard,
                {
                  backgroundColor: theme.colors.neutral.surface,
                  borderColor: isDark ? theme.colors.neutral.borderStrong : theme.colors.brand.softGold,
                },
              ]}
            >
              <View
                style={[
                  styles.alertBadge,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignSelf: isRTL ? 'flex-end' : 'flex-start',
                    backgroundColor: isDark ? 'rgba(231, 206, 134, 0.16)' : 'rgba(201, 166, 70, 0.14)',
                    borderColor: isDark ? 'rgba(231, 206, 134, 0.22)' : 'rgba(201, 166, 70, 0.28)',
                  },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={isDark ? theme.colors.brand.softGold : theme.colors.brand.gold}
                />
                <AppText
                  variant="label"
                  color={isDark ? theme.colors.brand.softGold : theme.colors.brand.gold}
                >
                  {t('appName')}
                </AppText>
              </View>

              <View style={styles.alertTextWrap}>
                <AppText variant="headingSm">{activeAlert?.title}</AppText>
                {!!activeAlert?.message && (
                  <AppText
                    variant="bodyMd"
                    color={theme.colors.neutral.textSecondary}
                    style={styles.alertMessage}
                  >
                    {activeAlert.message}
                  </AppText>
                )}
              </View>

              <View
                style={[
                  styles.actionsWrap,
                  activeAlert && activeAlert.actions.length <= 2 ? styles.actionsRow : styles.actionsColumn,
                ]}
              >
                {(activeAlert?.actions ?? []).map((action, index, actions) => {
                  const isSinglePrimary = actions.length === 1 && action.style !== 'cancel' && action.style !== 'destructive';
                  const backgroundColor =
                    action.style === 'destructive'
                      ? theme.colors.neutral.danger
                      : action.style === 'cancel'
                        ? theme.colors.neutral.surfaceAlt
                        : isSinglePrimary
                          ? theme.colors.brand.darkGreen
                          : theme.colors.brand.gold;
                  const borderColor =
                    action.style === 'cancel'
                      ? isDark
                        ? theme.colors.neutral.borderStrong
                        : theme.colors.neutral.border
                      : action.style === 'destructive'
                        ? 'transparent'
                        : isSinglePrimary
                          ? 'transparent'
                          : '#C2A456';
                  const textColor =
                    action.style === 'cancel'
                      ? theme.colors.neutral.textPrimary
                      : action.style === 'destructive'
                        ? '#2A0E12'
                        : isSinglePrimary
                          ? theme.colors.neutral.textOnBrand
                          : theme.colors.brand.darkGreen;

                  return (
                    <Pressable
                      key={`${action.text}-${index}`}
                      onPress={() => handleActionPress(action)}
                      style={({ pressed }) => [
                        styles.actionButton,
                        actions.length > 2 ? styles.actionButtonStacked : styles.actionButtonInline,
                        {
                          backgroundColor,
                          borderColor,
                          opacity: pressed ? 0.86 : 1,
                        },
                      ]}
                    >
                      <AppText variant="button" color={textColor} numberOfLines={1}>
                        {action.text}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </AppAlertContext.Provider>
  );
};

export const useAppAlert = () => {
  const context = React.useContext(AppAlertContext);

  if (!context) {
    throw new Error('useAppAlert must be used inside AppAlertProvider');
  }

  return context;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 16, 12, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  alertCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 26,
    elevation: 14,
  },
  alertBadge: {
    alignSelf: 'flex-start',
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertTextWrap: {
    gap: 8,
  },
  alertMessage: {
    lineHeight: 23,
  },
  actionsWrap: {
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  actionButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionButtonInline: {
    flex: 1,
  },
  actionButtonStacked: {
    width: '100%',
  },
  toastWrap: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 1000,
  },
  toastCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  toastIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTextWrap: {
    flex: 1,
    gap: 2,
  },
});
