import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { adhanVoiceOptions, getAdhanVoiceById } from '@/constants/adhan';
import { adhanAudioService } from '@/services/adhanAudioService';
import { storage } from '@/services/storage';
import { buildNotificationFingerprint } from '@/services/prayer/fingerprints';
import {
  addDaysToDateKey,
  combineDateAndTimeInZone,
  getDateKeyInTimeZone,
  getDeviceTimeZone,
} from '@/services/prayer/dateTime';
import { prayerLogger } from '@/services/prayer/logger';
import { getDailyWirdReminderBody } from '@/features/khatma/utils/dailyWirdReminder';
import { useSettingsStore } from '@/state/settingsStore';
import {
  AdhanPrayerName,
  AdhanVoiceId,
  DhikrLoopSettings,
  PrayerDaySchedule,
  PrayerName,
  PrayerSettings,
  ReminderSetting,
  ScheduledNotificationMeta,
} from '@/types/models';
import { isClockTime, parseClockTime } from '@/utils/time';
import i18n from '@/i18n';

let notificationsModulePromise: Promise<typeof import('expo-notifications')> | null = null;
let notificationHandlerConfigured = false;
let notificationQueue: Promise<void> = Promise.resolve();
let notificationResponseSubscriptionBound = false;
let notificationReceivedSubscriptionBound = false;
let activeAdhanNotificationIdentifier: string | null = null;

type AppLang = 'ar' | 'en';
type PermissionSnapshot = {
  granted: boolean;
  status: string;
  canAskAgain?: boolean;
};

type NotificationScheduleState = {
  schemaVersion: number;
  notifications: Record<string, ScheduledNotificationMeta>;
  lastFingerprint?: string;
  lastSyncedAt?: string;
  scheduledUntil?: string;
};

type AdhanScheduleResult = {
  granted: boolean;
  scheduledCount: number;
  scheduledUntil?: string;
  truncated: boolean;
};

type OpenPayload = {
  kind?: 'reminder' | 'adhan' | 'pre_adhan' | 'dhikr_loop';
  reminderType?: ReminderSetting['type'];
  target?: 'adhkar' | 'prayer' | 'reminders';
};

type NotificationPayload = OpenPayload & {
  voiceId?: AdhanVoiceId;
};

type AdhanDescriptor = {
  id: string;
  kind: 'adhan' | 'pre_adhan';
  prayer: AdhanPrayerName;
  date: string;
  fireDate: Date;
  channelId: string;
  sound: boolean | string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

const NOTIFICATION_STATE_KEY = 'noor.notifications.runtime.v2';
const NOTIFICATION_STATE_VERSION = 2;
const ADHAN_PREFIX = 'noor-prayer-adhan-';
const PRE_ADHAN_PREFIX = 'noor-prayer-preadhan-';
const REMINDER_PREFIX = 'noor-reminder-';
const DHIKR_LOOP_ID = 'noor-dhikr-loop';
const IOS_PENDING_LIMIT = 60;
const IOS_RESERVED_PENDING = 10;
const ADHAN_LOOKAHEAD_DAYS_ANDROID = 30;
const REMINDER_LOOKAHEAD_DAYS_ANDROID = 7;
const MIN_SCHEDULE_LEAD_MS = 1_000;
const DHIKR_MIN_INTERVAL_MINUTES = 5;
const DHIKR_MAX_INTERVAL_MINUTES = 180;
const FIRE_NOW_TRIGGER = null;
const ADHAN_NOTIFICATION_CATEGORY_ID = 'adhan-controls';
const ADHAN_STOP_ACTION_ID = 'adhan-stop';
const ADHAN_DEFAULT_ACTION_ID = 'expo.modules.notifications.actions.DEFAULT';
const IOS_NOTIFICATION_DISMISS_ACTION_ID = 'com.apple.UNNotificationDismissActionIdentifier';
const adhanPrayers: AdhanPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';
const validReminderTypes = new Set<ReminderSetting['type']>([
  'wird',
  'daily_wird',
  'morning_adhkar',
  'evening_adhkar',
  'mulk',
  'kahf',
  'baqarah',
  'prayer_fajr',
  'prayer_sunrise',
  'prayer_dhuhr',
  'prayer_asr',
  'prayer_maghrib',
  'prayer_isha',
]);

const sanitizeReminder = (reminder: ReminderSetting): ReminderSetting | null => {
  if (!validReminderTypes.has(reminder.type) || !isClockTime(reminder.time)) {
    return null;
  }

  return {
    id: reminder.id || reminder.type,
    type: reminder.type,
    enabled: reminder.enabled === true,
    time: reminder.time,
  };
};

const sanitizeReminders = (reminders: ReminderSetting[]) => {
  const seenIds = new Set<string>();
  const sanitized: ReminderSetting[] = [];

  for (const reminder of reminders) {
    const nextReminder = sanitizeReminder(reminder);
    if (!nextReminder || seenIds.has(nextReminder.id)) {
      continue;
    }

    seenIds.add(nextReminder.id);
    sanitized.push(nextReminder);
  }

  return sanitized;
};

const sanitizeScheduledMeta = (value: ScheduledNotificationMeta | null | undefined) => {
  if (!value) return null;
  const isKnownKind =
    value.kind === 'adhan' ||
    value.kind === 'pre_adhan' ||
    value.kind === 'reminder' ||
    value.kind === 'dhikr_loop';

  if (!isKnownKind || typeof value.id !== 'string' || typeof value.fireDate !== 'string') {
    return null;
  }

  if (value.prayerName && !adhanPrayers.includes(value.prayerName)) {
    return null;
  }

  return {
    id: value.id,
    kind: value.kind,
    fireDate: value.fireDate,
    prayerName: value.prayerName,
    date: value.date,
    channelId: value.channelId,
  } satisfies ScheduledNotificationMeta;
};

const loadNotificationState = async (): Promise<NotificationScheduleState> => {
  const raw = await storage.getItem<NotificationScheduleState>(NOTIFICATION_STATE_KEY);
  if (!raw || raw.schemaVersion !== NOTIFICATION_STATE_VERSION) {
    return {
      schemaVersion: NOTIFICATION_STATE_VERSION,
      notifications: {},
    };
  }

  return {
    schemaVersion: NOTIFICATION_STATE_VERSION,
    notifications: Object.fromEntries(
      Object.entries(raw.notifications ?? {}).reduce<Array<[string, ScheduledNotificationMeta]>>(
        (accumulator, [key, value]) => {
          const sanitized = sanitizeScheduledMeta(value);
          if (sanitized) {
            accumulator.push([key, sanitized]);
          }

          return accumulator;
        },
        [],
      ),
    ),
    lastFingerprint: typeof raw.lastFingerprint === 'string' ? raw.lastFingerprint : undefined,
    lastSyncedAt: typeof raw.lastSyncedAt === 'string' ? raw.lastSyncedAt : undefined,
    scheduledUntil: typeof raw.scheduledUntil === 'string' ? raw.scheduledUntil : undefined,
  };
};

const saveNotificationState = async (nextState: NotificationScheduleState) => {
  await storage.setItem(NOTIFICATION_STATE_KEY, nextState);
};

const getCurrentLang = (): AppLang => ((i18n.resolvedLanguage ?? i18n.language).startsWith('en') ? 'en' : 'ar');
const getAppTitle = (lang: AppLang) => i18n.t('appName', { lng: lang });
const getAdhanStopActionTitle = (lang: AppLang) => (lang === 'ar' ? 'إيقاف الأذان' : 'Stop Adhan');

const normalizeIntervalMinutes = (value: number) => {
  const rounded = Number.isFinite(value) ? Math.round(value) : 30;
  return Math.min(DHIKR_MAX_INTERVAL_MINUTES, Math.max(DHIKR_MIN_INTERVAL_MINUTES, rounded));
};

const runNotificationTask = <T>(task: () => Promise<T>) => {
  const nextTask = notificationQueue.then(task, task);
  notificationQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );
  return nextTask;
};

const isNotificationPermissionGranted = (status: {
  granted?: boolean;
  status?: string;
  ios?: { status?: number };
}) => {
  if (status.granted === true || status.status === 'granted') {
    return true;
  }

  return status.ios?.status === 2 || status.ios?.status === 3 || status.ios?.status === 4;
};

const sanitizeOpenPayload = (value: unknown): OpenPayload => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const candidate = value as Partial<OpenPayload>;
  const kind =
    candidate.kind === 'reminder' ||
    candidate.kind === 'adhan' ||
    candidate.kind === 'pre_adhan' ||
    candidate.kind === 'dhikr_loop'
      ? candidate.kind
      : undefined;
  const target =
    candidate.target === 'adhkar' || candidate.target === 'prayer' || candidate.target === 'reminders'
      ? candidate.target
      : undefined;
  const reminderType =
    candidate.reminderType && validReminderTypes.has(candidate.reminderType)
      ? candidate.reminderType
      : undefined;

  return {
    kind,
    target,
    reminderType,
  };
};

const sanitizeNotificationPayload = (value: unknown): NotificationPayload => {
  const payload = sanitizeOpenPayload(value);
  if (!value || typeof value !== 'object') {
    return payload;
  }

  const candidate = value as { voiceId?: unknown };
  const voiceId =
    typeof candidate.voiceId === 'string' ? getAdhanVoiceById(candidate.voiceId).id : undefined;

  return {
    ...payload,
    voiceId,
  };
};

const clearAdhanMonitor = () => {
  activeAdhanNotificationIdentifier = null;
};

const stopTrackedAdhanPlayback = async (notificationIdentifier?: string) => {
  if (
    notificationIdentifier &&
    activeAdhanNotificationIdentifier &&
    activeAdhanNotificationIdentifier !== notificationIdentifier
  ) {
    return;
  }

  clearAdhanMonitor();
  await adhanAudioService.stop();
};

const startAdhanDismissMonitor = (notificationIdentifier: string) => {
  clearAdhanMonitor();
  activeAdhanNotificationIdentifier = notificationIdentifier;
};

const maybePlayForegroundAdhan = async (
  notification: {
    request: {
      identifier: string;
      content: { data: unknown };
    };
  },
) => {
  const payload = sanitizeNotificationPayload(notification.request.content.data);
  if (payload.kind !== 'adhan') {
    return;
  }

  const settings = useSettingsStore.getState().prayerSettings;
  if (settings.notificationMode !== 'adhan_sound') {
    return;
  }

  const voiceId = payload.voiceId ?? getAdhanVoiceById(settings.adhanVoice).id;
  const notificationIdentifier = notification.request.identifier;
  startAdhanDismissMonitor(notificationIdentifier);

  const played = await adhanAudioService.playPrayerAdhan(voiceId, {
    onStop: () => {
      if (activeAdhanNotificationIdentifier === notificationIdentifier) {
        clearAdhanMonitor();
      }
    },
  });

  if (!played && activeAdhanNotificationIdentifier === notificationIdentifier) {
    clearAdhanMonitor();
  }
};

const getReminderBody = (type: ReminderSetting['type'], lang: AppLang) => {
  if (type === 'wird') return i18n.t('reminders.wird', { lng: lang });
  if (type === 'daily_wird') return getDailyWirdReminderBody(lang);
  if (type === 'morning_adhkar') return i18n.t('reminders.morning', { lng: lang });
  if (type === 'evening_adhkar') return i18n.t('reminders.evening', { lng: lang });
  if (type === 'mulk') return i18n.t('reminders.mulk', { lng: lang });
  if (type === 'kahf') return i18n.t('reminders.kahf', { lng: lang });
  if (type === 'baqarah') return i18n.t('reminders.baqarah', { lng: lang });

  if (type.startsWith('prayer_')) {
    const prayerName = type.replace('prayer_', '') as PrayerName;
    const localizedPrayer = i18n.t(`prayer.names.${prayerName}`, { lng: lang });
    return lang === 'ar' ? `تنبيه ${localizedPrayer}` : `${localizedPrayer} reminder`;
  }

  return lang === 'ar' ? 'تذكير' : 'Reminder';
};

const getDhikrCycle = (lang: AppLang) =>
  lang === 'ar'
    ? ['سبحان الله', 'الحمد لله', 'لا إله إلا الله', 'الله أكبر', 'لا حول ولا قوة إلا بالله']
    : [
        'Subhan Allah',
        'Alhamdulillah',
        'La ilaha illa Allah',
        'Allahu Akbar',
        'La hawla wa la quwwata illa billah',
      ];

const getRandomDhikrCycleIndex = (lang: AppLang) => {
  const phrases = getDhikrCycle(lang);
  return Math.floor(Math.random() * phrases.length);
};

const getDhikrLoopContent = (lang: AppLang, cycleIndex?: number) => {
  const phrases = getDhikrCycle(lang);
  const resolvedIndex = typeof cycleIndex === 'number' ? cycleIndex : getRandomDhikrCycleIndex(lang);
  return {
    title: lang === 'ar' ? 'أذكار دورية' : 'Dhikr Reminder',
    body: phrases[resolvedIndex % phrases.length],
    data: {
      kind: 'dhikr_loop' as const,
      cycleIndex: resolvedIndex,
      target: 'adhkar' as const,
    },
    sound: 'default' as const,
  };
};

const getNotificationsModule = async () => {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }

  const Notifications = await notificationsModulePromise;

  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const payload = sanitizeNotificationPayload(notification.request.content.data);
        const mode = useSettingsStore.getState().prayerSettings.notificationMode;
        const shouldPlaySound =
          payload.kind === 'adhan'
            ? mode === 'default_sound'
            : payload.kind === 'pre_adhan'
              ? mode !== 'silent'
              : true;

        return {
          shouldShowAlert: true,
          shouldPlaySound,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        };
      },
    });
    notificationHandlerConfigured = true;
  }

  if (!notificationReceivedSubscriptionBound) {
    Notifications.addNotificationReceivedListener((notification) => {
      void maybePlayForegroundAdhan(notification);
    });
    notificationReceivedSubscriptionBound = true;
  }

  return Notifications;
};

const ensureChannels = async (Notifications: typeof import('expo-notifications'), lang: AppLang) => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: lang === 'ar' ? 'المنبهات العامة' : 'General reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 180, 250],
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('adhan-silent', {
    name: lang === 'ar' ? 'الأذان الصامت' : 'Silent adhan',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [],
    sound: null,
  });

  await Promise.all(
    adhanVoiceOptions.map((voice) =>
      Notifications.setNotificationChannelAsync(`adhan-${voice.id}`, {
        name: lang === 'ar' ? `أذان - ${voice.labelAr}` : `Adhan - ${voice.labelEn}`,
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 200, 300],
        ...(isExpoGo ? { sound: 'default' } : { sound: voice.notificationSound }),
      }),
    ),
  );

  await Notifications.setNotificationChannelAsync('dhikr-loop', {
    name: lang === 'ar' ? 'أذكار دورية' : 'Dhikr loop',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    sound: 'default',
  });
};

const ensureCategories = async (Notifications: typeof import('expo-notifications'), lang: AppLang) => {
  try {
    await Notifications.setNotificationCategoryAsync(
      ADHAN_NOTIFICATION_CATEGORY_ID,
      [
        {
          identifier: ADHAN_STOP_ACTION_ID,
          buttonTitle: getAdhanStopActionTitle(lang),
          options: {
            opensAppToForeground: false,
          },
        },
      ],
      {
        customDismissAction: true,
      },
    );
  } catch (error) {
    prayerLogger.warn('Unable to configure notification categories', error);
  }
};

const prepareLocalNotifications = async (lang: AppLang = getCurrentLang()) => {
  const Notifications = await getNotificationsModule();
  await ensureChannels(Notifications, lang);
  await ensureCategories(Notifications, lang);
  return Notifications;
};

const getPermissionSnapshotWithModule = async (lang: AppLang = getCurrentLang()) => {
  const Notifications = await prepareLocalNotifications(lang);
  const status = await Notifications.getPermissionsAsync();
  return {
    Notifications,
    snapshot: {
      granted: isNotificationPermissionGranted(status),
      status: status.status,
      canAskAgain: status.canAskAgain,
    } satisfies PermissionSnapshot,
  };
};

const ensurePermission = async (lang: AppLang = getCurrentLang()) => {
  const { Notifications, snapshot: currentSnapshot } = await getPermissionSnapshotWithModule(lang);
  if (currentSnapshot.granted) {
    return {
      Notifications,
      snapshot: currentSnapshot,
    };
  }

  const requestedStatus = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return {
    Notifications,
    snapshot: {
      granted: isNotificationPermissionGranted(requestedStatus),
      status: requestedStatus.status,
      canAskAgain: requestedStatus.canAskAgain,
    } satisfies PermissionSnapshot,
  };
};

const getAdhanChannelId = (settings: PrayerSettings, voiceId: AdhanVoiceId) => {
  if (settings.notificationMode === 'silent') {
    return 'adhan-silent';
  }

  if (settings.notificationMode === 'default_sound') {
    return 'default';
  }

  return `adhan-${getAdhanVoiceById(voiceId).id}`;
};

const getAdhanSound = (settings: PrayerSettings, voiceId: AdhanVoiceId): boolean | string => {
  if (settings.notificationMode === 'silent') {
    return false;
  }

  if (settings.notificationMode === 'default_sound') {
    return 'default';
  }

  // iOS notification sounds cannot exceed 30 seconds and must be bundled in a
  // supported system format. We ship short CAF versions for closed-app alerts,
  // while the full adhan keeps playing through the in-app audio player whenever
  // the runtime is alive.
  if (Platform.OS === 'ios') {
    return getAdhanVoiceById(voiceId).iosNotificationSound;
  }

  return isExpoGo ? 'default' : getAdhanVoiceById(voiceId).notificationSound;
};

const getReminderTarget = (type: ReminderSetting['type']) => {
  if (type === 'morning_adhkar' || type === 'evening_adhkar') return 'adhkar';
  if (type.startsWith('prayer_')) return 'prayer';
  return 'reminders';
};

const getAdhanFireDate = (
  day: PrayerDaySchedule,
  prayer: AdhanPrayerName,
  settings: PrayerSettings,
) => {
  if (settings.timeMode === 'manual') {
    const manualTime = settings.manualPrayerTimes[prayer];
    if (isClockTime(manualTime)) {
      return combineDateAndTimeInZone(day.date, manualTime, day.timezone);
    }
  }

  return new Date(day.timestamps[prayer]);
};

const presentImmediateNotification = async (
  Notifications: typeof import('expo-notifications'),
  content: {
    title: string;
    body: string;
    data: Record<string, unknown>;
    sound: 'default';
  },
  channelId?: string,
) => {
  await Notifications.scheduleNotificationAsync({
    content,
    trigger: Platform.OS === 'android' && channelId ? { channelId } : FIRE_NOW_TRIGGER,
  });
};

const cancelIdentifiers = async (
  Notifications: typeof import('expo-notifications'),
  identifiers: string[],
) => {
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined),
    ),
  );
};

const getScheduledNotificationsByPrefix = async (
  Notifications: typeof import('expo-notifications'),
  prefixes: string[],
) => {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  return existing.filter((item) => prefixes.some((prefix) => item.identifier.startsWith(prefix)));
};

const syncRemindersInternal = async (reminders: ReminderSetting[], lang: AppLang) => {
  const { Notifications, snapshot } = await getPermissionSnapshotWithModule(lang);
  if (!snapshot.granted) return false;

  const existing = await getScheduledNotificationsByPrefix(Notifications, [REMINDER_PREFIX]);
  const enabled = sanitizeReminders(reminders).filter((item) => item.enabled);
  await cancelIdentifiers(
    Notifications,
    existing.map((item) => item.identifier),
  );

  if (Platform.OS === 'android') {
    const now = new Date();
    const timeZone = getDeviceTimeZone();
    const todayKey = getDateKeyInTimeZone(now, timeZone);

    for (const reminder of enabled) {
      for (let offset = 0; offset < REMINDER_LOOKAHEAD_DAYS_ANDROID; offset += 1) {
        const dateKey = addDaysToDateKey(todayKey, offset);
        const fireDate = combineDateAndTimeInZone(dateKey, reminder.time, timeZone);
        if (fireDate.getTime() <= now.getTime() + MIN_SCHEDULE_LEAD_MS) {
          continue;
        }

        await Notifications.scheduleNotificationAsync({
          identifier: `${REMINDER_PREFIX}${reminder.id}-${dateKey}`,
          content: {
            title: getAppTitle(lang),
            body: getReminderBody(reminder.type, lang),
            data: {
              kind: 'reminder',
              reminderType: reminder.type,
              target: getReminderTarget(reminder.type),
              date: dateKey,
            },
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
            channelId: 'default',
          },
        });
      }
    }

    return true;
  }

  for (const reminder of enabled) {
    const identifier = `${REMINDER_PREFIX}${reminder.id}`;
    const parsedTime = parseClockTime(reminder.time);
    if (!parsedTime) {
      prayerLogger.warn('Skipping invalid reminder schedule', { reminderId: reminder.id });
      continue;
    }

    const { hour, minute } = parsedTime;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: getAppTitle(lang),
        body: getReminderBody(reminder.type, lang),
        data: {
          kind: 'reminder',
          reminderType: reminder.type,
          target: getReminderTarget(reminder.type),
        },
        sound: 'default',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
  }

  return true;
};

const syncDhikrLoopNotificationsInternal = async (
  settings: DhikrLoopSettings,
  lang: AppLang,
  options?: {
    sendImmediateNow?: boolean;
  },
) => {
  const { Notifications, snapshot } = await getPermissionSnapshotWithModule(lang);
  if (!snapshot.granted) return false;

  const intervalMinutes = normalizeIntervalMinutes(settings.intervalMinutes);
  const cycleIndex = getRandomDhikrCycleIndex(lang);
  const immediateContent = getDhikrLoopContent(lang, cycleIndex);

  if (options?.sendImmediateNow) {
    await presentImmediateNotification(Notifications, immediateContent, 'dhikr-loop');
  }

  await Notifications.cancelScheduledNotificationAsync(DHIKR_LOOP_ID).catch(() => undefined);
  if (!settings.enabled) return true;

  await Notifications.scheduleNotificationAsync({
    identifier: DHIKR_LOOP_ID,
    content: getDhikrLoopContent(lang, cycleIndex),
    trigger:
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: intervalMinutes * 60,
            repeats: true,
            channelId: 'dhikr-loop',
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: intervalMinutes * 60,
            repeats: true,
          },
  });

  return true;
};

const getAvailableIosAdhanSlots = async (Notifications: typeof import('expo-notifications')) => {
  if (Platform.OS !== 'ios') return Number.MAX_SAFE_INTEGER;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const existingNonAdhanCount = existing.filter(
    (item) =>
      !item.identifier.startsWith(ADHAN_PREFIX) &&
      !item.identifier.startsWith(PRE_ADHAN_PREFIX),
  ).length;

  return Math.max(0, IOS_PENDING_LIMIT - IOS_RESERVED_PENDING - existingNonAdhanCount);
};

const buildAdhanDescriptors = async (
  Notifications: typeof import('expo-notifications'),
  days: PrayerDaySchedule[],
  settings: PrayerSettings,
  lang: AppLang,
  now: Date,
) => {
  const voice = getAdhanVoiceById(settings.adhanVoice);
  const descriptors: AdhanDescriptor[] = [];
  const maxDescriptors =
    Platform.OS === 'ios'
      ? await getAvailableIosAdhanSlots(Notifications)
      : adhanPrayers.length * ADHAN_LOOKAHEAD_DAYS_ANDROID * 2;

  for (const day of days) {
    for (const prayer of adhanPrayers) {
      if (!settings.prayerNotifications[prayer]) {
        continue;
      }

      const fireDate = getAdhanFireDate(day, prayer, settings);
      if (fireDate.getTime() <= now.getTime() + MIN_SCHEDULE_LEAD_MS) {
        continue;
      }

      if (settings.preAdhanReminderEnabled) {
        const preFireDate = new Date(
          fireDate.getTime() - settings.preAdhanReminderMinutes * 60_000,
        );

        if (preFireDate.getTime() > now.getTime() + MIN_SCHEDULE_LEAD_MS) {
          const prayerLabel = i18n.t(`prayer.names.${prayer}`, { lng: lang });
          descriptors.push({
            id: `${PRE_ADHAN_PREFIX}${day.date}-${prayer}`,
            kind: 'pre_adhan',
            prayer,
            date: day.date,
            fireDate: preFireDate,
            channelId: 'default',
            sound: settings.notificationMode === 'silent' ? false : 'default',
            title: lang === 'ar' ? `اقترب موعد ${prayerLabel}` : `${prayerLabel} is coming soon`,
            body:
              lang === 'ar'
                ? `يتبقى ${settings.preAdhanReminderMinutes} دقيقة على أذان ${prayerLabel}`
                : `${settings.preAdhanReminderMinutes} minutes left until ${prayerLabel}`,
            data: {
              kind: 'pre_adhan',
              prayer,
              target: 'prayer',
              date: day.date,
            },
          });
        }
      }

      const prayerLabel = i18n.t(`prayer.names.${prayer}`, { lng: lang });
      const selectedVoiceLabel = lang === 'ar' ? voice.labelAr : voice.labelEn;

      descriptors.push({
        id: `${ADHAN_PREFIX}${day.date}-${prayer}`,
        kind: 'adhan',
        prayer,
        date: day.date,
        fireDate,
        channelId: getAdhanChannelId(settings, settings.adhanVoice),
        sound: getAdhanSound(settings, settings.adhanVoice),
        title: lang === 'ar' ? `أذان ${prayerLabel}` : `${prayerLabel} Adhan`,
        body:
          lang === 'ar'
            ? `حان الآن موعد أذان ${prayerLabel} ${settings.notificationMode === 'silent' ? '' : `بصوت ${selectedVoiceLabel}`}`.trim()
            : settings.notificationMode === 'silent'
              ? `It is now time for ${prayerLabel}.`
              : `Now: ${prayerLabel} adhan with ${selectedVoiceLabel}`,
        data: {
          kind: 'adhan',
          prayer,
          target: 'prayer',
          date: day.date,
          voiceId: settings.adhanVoice,
          cityName: day.cityName,
        },
      });

      if (descriptors.length >= maxDescriptors) {
        return {
          descriptors: descriptors.slice(0, maxDescriptors),
          truncated: true,
        };
      }
    }
  }

  return {
    descriptors,
    truncated: false,
  };
};

const scheduleAdhanDescriptor = async (
  Notifications: typeof import('expo-notifications'),
  descriptor: AdhanDescriptor,
) => {
  await Notifications.scheduleNotificationAsync({
    identifier: descriptor.id,
    content: {
      title: descriptor.title,
      body: descriptor.body,
      data: descriptor.data,
      sound: descriptor.sound,
      categoryIdentifier: descriptor.kind === 'adhan' ? ADHAN_NOTIFICATION_CATEGORY_ID : undefined,
      interruptionLevel:
        descriptor.kind === 'adhan' && descriptor.sound !== false ? 'timeSensitive' : 'active',
    },
    trigger:
      Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: descriptor.fireDate,
            channelId: descriptor.channelId,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: descriptor.fireDate,
          },
  });
};

const ensureAdhanScheduleInternal = async ({
  days,
  settings,
  lang,
  now = new Date(),
  force = false,
}: {
  days: PrayerDaySchedule[];
  settings: PrayerSettings;
  lang: AppLang;
  now?: Date;
  force?: boolean;
}): Promise<AdhanScheduleResult> => {
  const { Notifications, snapshot } = await getPermissionSnapshotWithModule(lang);
  if (!snapshot.granted) {
    return {
      granted: false,
      scheduledCount: 0,
      truncated: false,
    };
  }

  const state = await loadNotificationState();
  const { descriptors, truncated } = await buildAdhanDescriptors(
    Notifications,
    days,
    settings,
    lang,
    now,
  );
  const fingerprint = buildNotificationFingerprint(settings, lang, days);
  const existing = await getScheduledNotificationsByPrefix(Notifications, [ADHAN_PREFIX, PRE_ADHAN_PREFIX]);
  const existingIds = new Set(existing.map((item) => item.identifier));
  const persistedScheduleMatches = descriptors.every((descriptor) => {
    const persisted = state.notifications[descriptor.id];
    return persisted?.fireDate === descriptor.fireDate.toISOString();
  });
  const scheduleAlreadyHealthy =
    !force &&
    state.lastFingerprint === fingerprint &&
    existing.length === descriptors.length &&
    descriptors.every((descriptor) => existingIds.has(descriptor.id)) &&
    persistedScheduleMatches;

  if (scheduleAlreadyHealthy) {
    return {
      granted: true,
      scheduledCount: descriptors.length,
      scheduledUntil: state.scheduledUntil,
      truncated,
    };
  }

  // When prayer times, manual times, calculation settings, or notification settings change,
  // identifiers often stay the same while the fire dates change. Rebuild the whole adhan
  // window instead of only filling missing IDs so the scheduled times always stay in sync.
  await cancelIdentifiers(
    Notifications,
    existing.map((item) => item.identifier),
  );

  for (const descriptor of descriptors) {
    await scheduleAdhanDescriptor(Notifications, descriptor);
  }

  const nextState: NotificationScheduleState = {
    schemaVersion: NOTIFICATION_STATE_VERSION,
    notifications: Object.fromEntries(
      descriptors.map((descriptor) => [
        descriptor.id,
        {
          id: descriptor.id,
          kind: descriptor.kind,
          fireDate: descriptor.fireDate.toISOString(),
          prayerName: descriptor.prayer,
          date: descriptor.date,
          channelId: descriptor.channelId,
        },
      ]),
    ),
    lastFingerprint: fingerprint,
    lastSyncedAt: new Date().toISOString(),
    scheduledUntil: descriptors.at(-1)?.date,
  };

  await saveNotificationState(nextState);
  prayerLogger.info('Adhan notifications scheduled', {
    count: descriptors.length,
    scheduledUntil: nextState.scheduledUntil,
    truncated,
  });

  return {
    granted: true,
    scheduledCount: descriptors.length,
    scheduledUntil: nextState.scheduledUntil,
    truncated,
  };
};

const syncSupplementalNotificationsInternal = async ({
  reminders,
  dhikrLoopSettings,
  lang,
}: {
  reminders: ReminderSetting[];
  dhikrLoopSettings: DhikrLoopSettings;
  lang: AppLang;
}) => {
  const remindersOk = await syncRemindersInternal(reminders, lang);
  const dhikrOk = await syncDhikrLoopNotificationsInternal(dhikrLoopSettings, lang);
  return remindersOk && dhikrOk;
};

export const notificationService = {
  prepareRuntime: async (lang: AppLang = getCurrentLang()) => {
    try {
      await prepareLocalNotifications(lang);
      return true;
    } catch (error) {
      prayerLogger.warn('Unable to prepare notification runtime', error);
      return false;
    }
  },

  getPermissionSnapshot: async (): Promise<PermissionSnapshot> => {
    try {
      const { snapshot } = await getPermissionSnapshotWithModule(getCurrentLang());
      return snapshot;
    } catch (error) {
      prayerLogger.warn('Unable to read notification permission state', error);
      return {
        granted: false,
        status: 'unknown',
      };
    }
  },

  getPermissionStatus: async () => {
    const snapshot = await notificationService.getPermissionSnapshot();
    return snapshot.granted;
  },

  requestPermission: async () => {
    try {
      const { snapshot } = await ensurePermission(getCurrentLang());
      return snapshot.granted;
    } catch (error) {
      prayerLogger.warn('Unable to request notification permission', error);
      return false;
    }
  },

  registerForPushToken: async () => null,

  syncReminders: async (reminders: ReminderSetting[], lang: AppLang = getCurrentLang()) =>
    runNotificationTask(async () => {
      try {
        return await syncRemindersInternal(reminders, lang);
      } catch (error) {
        prayerLogger.error('Failed to sync reminder notifications', error);
        return false;
      }
    }),

  syncDhikrLoopNotifications: async (
    settings: DhikrLoopSettings,
    lang: AppLang = getCurrentLang(),
    options?: {
      sendImmediateNow?: boolean;
    },
  ) =>
    runNotificationTask(async () => {
      try {
        return await syncDhikrLoopNotificationsInternal(settings, lang, options);
      } catch (error) {
        prayerLogger.error('Failed to sync dhikr loop notifications', error);
        return false;
      }
    }),

  syncSupplementalNotifications: async ({
    reminders,
    dhikrLoopSettings,
    lang = getCurrentLang(),
  }: {
    reminders: ReminderSetting[];
    dhikrLoopSettings: DhikrLoopSettings;
    lang?: AppLang;
  }) =>
    runNotificationTask(async () => {
      try {
        return await syncSupplementalNotificationsInternal({
          reminders,
          dhikrLoopSettings,
          lang,
        });
      } catch (error) {
        prayerLogger.error('Failed to sync supplemental notifications', error);
        return false;
      }
    }),

  ensureAdhanSchedule: async ({
    days,
    settings,
    lang = getCurrentLang(),
    now = new Date(),
    force = false,
  }: {
    days: PrayerDaySchedule[];
    settings: PrayerSettings;
    lang?: AppLang;
    now?: Date;
    force?: boolean;
  }) =>
    runNotificationTask(async () => {
      try {
        return await ensureAdhanScheduleInternal({
          days,
          settings,
          lang,
          now,
          force,
        });
      } catch (error) {
        prayerLogger.error('Failed to repair adhan notification schedule', error);
        return {
          granted: false,
          scheduledCount: 0,
          truncated: false,
        } satisfies AdhanScheduleResult;
      }
    }),

  syncAllLocalNotifications: async ({
    reminders,
    dhikrLoopSettings,
    lang = getCurrentLang(),
  }: {
    reminders: ReminderSetting[];
    dhikrLoopSettings: DhikrLoopSettings;
    prayerTimes?: unknown;
    prayerSettings?: unknown;
    adhanVoice?: unknown;
    lang?: AppLang;
  }) =>
    runNotificationTask(async () => {
      try {
        return await syncSupplementalNotificationsInternal({
          reminders,
          dhikrLoopSettings,
          lang,
        });
      } catch (error) {
        prayerLogger.error('Failed to sync local notifications', error);
        return false;
      }
    }),

  clearAccountScopedNotifications: async () =>
    runNotificationTask(async () => {
      try {
        const Notifications = await prepareLocalNotifications(getCurrentLang());
        const existing = await getScheduledNotificationsByPrefix(Notifications, [
          ADHAN_PREFIX,
          PRE_ADHAN_PREFIX,
          REMINDER_PREFIX,
        ]);

        await cancelIdentifiers(
          Notifications,
          existing.map((item) => item.identifier).concat(DHIKR_LOOP_ID),
        );
        await storage.removeItem(NOTIFICATION_STATE_KEY);
      } catch (error) {
        prayerLogger.warn('Unable to clear account-scoped notifications', error);
      }
    }),

  subscribeToNotificationOpen: async (
    onOpen: (payload: OpenPayload) => void,
    options?: { consumeInitialResponse?: boolean },
  ) => {
    try {
      const Notifications = await prepareLocalNotifications(getCurrentLang());
      const handledIds = new Set<string>();

      if (!notificationResponseSubscriptionBound) {
        notificationResponseSubscriptionBound = true;
      }

      const handleResponse = (response: {
        actionIdentifier: string;
        notification: { request: { identifier: string; content: { data: unknown } } };
      }) => {
        const notificationIdentifier = response.notification.request.identifier;
        const actionIdentifier = response.actionIdentifier;
        const payload = sanitizeNotificationPayload(response.notification.request.content.data);
        const handledKey = `${notificationIdentifier}:${actionIdentifier}`;
        if (handledIds.has(handledKey)) return;
        handledIds.add(handledKey);

        if (actionIdentifier === ADHAN_STOP_ACTION_ID) {
          void stopTrackedAdhanPlayback(notificationIdentifier);
          void Notifications.dismissNotificationAsync(notificationIdentifier);
          void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
          return;
        }

        if (actionIdentifier === IOS_NOTIFICATION_DISMISS_ACTION_ID) {
          void stopTrackedAdhanPlayback(notificationIdentifier);
          void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
          return;
        }

        if (actionIdentifier !== ADHAN_DEFAULT_ACTION_ID) {
          if (payload.kind === 'adhan') {
            void stopTrackedAdhanPlayback(notificationIdentifier);
          }
          void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
          return;
        }

        if (payload.kind === 'adhan') {
          void stopTrackedAdhanPlayback(notificationIdentifier);
        }

        onOpen(payload);

        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      };

      const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        handleResponse(
          response as unknown as {
            actionIdentifier: string;
            notification: { request: { identifier: string; content: { data: unknown } } };
          },
        );
      });

      if (options?.consumeInitialResponse === true) {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (lastResponse) {
          handleResponse(
            lastResponse as unknown as {
              actionIdentifier: string;
              notification: { request: { identifier: string; content: { data: unknown } } };
            },
          );
        }
      } else {
        void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      }

      return () => {
        subscription.remove();
      };
    } catch (error) {
      prayerLogger.warn('Unable to subscribe to notification open events', error);
      return () => {};
    }
  },
};
