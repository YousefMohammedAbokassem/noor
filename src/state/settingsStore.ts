import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeAdhanVoiceId } from '@/constants/adhan';
import { DhikrLoopSettings, PrayerSettings, ReminderSetting, SyncMetadata, ThemeMode } from '@/types/models';
import {
  defaultPrayerSettings,
  normalizePrayerSettings,
} from '@/services/prayer/defaults';

const baseReminders: ReminderSetting[] = [
  { id: 'wird', type: 'wird', enabled: true, time: '08:00' },
  { id: 'daily_wird', type: 'daily_wird', enabled: false, time: '08:15' },
  { id: 'morning_adhkar', type: 'morning_adhkar', enabled: true, time: '06:30' },
  { id: 'evening_adhkar', type: 'evening_adhkar', enabled: true, time: '18:00' },
  { id: 'mulk', type: 'mulk', enabled: false, time: '21:00' },
  { id: 'kahf', type: 'kahf', enabled: false, time: '09:00' },
  { id: 'baqarah', type: 'baqarah', enabled: false, time: '17:00' },
];

const buildDefaultReminders = () => baseReminders.map((item) => ({ ...item }));

const mergeReminderDefaults = (persisted?: ReminderSetting[] | null) => {
  const persistedItems = persisted ?? [];
  const persistedMap = new Map(persistedItems.map((item) => [item.id, item]));
  const merged = buildDefaultReminders().map((item) => ({
    ...item,
    ...(persistedMap.get(item.id) ?? {}),
  }));
  const knownIds = new Set(merged.map((item) => item.id));
  const extras = persistedItems.filter((item) => !knownIds.has(item.id));
  return [...merged, ...extras];
};

const defaultDhikrLoopSettings: DhikrLoopSettings = {
  enabled: false,
  intervalMinutes: 30,
};

const initialThemeTransition = {
  id: 0,
  originX: 340,
  originY: 90,
  fromTheme: 'dark' as ThemeMode,
  toTheme: 'dark' as ThemeMode,
  snapshotUri: null as string | null,
};

export type ThemeTransitionOrigin = {
  x: number;
  y: number;
};

export type ThemeTransitionState = {
  id: number;
  originX: number;
  originY: number;
  fromTheme: ThemeMode;
  toTheme: ThemeMode;
  snapshotUri: string | null;
};

type SettingsStore = {
  readerTheme: ThemeMode;
  themeTransition: ThemeTransitionState;
  prayerSettings: PrayerSettings;
  reminders: ReminderSetting[];
  dhikrLoopSettings: DhikrLoopSettings;
  vibrationEnabled: boolean;
  quranFlipSoundEnabled: boolean;
  syncMetadata: Pick<SyncMetadata, 'prayerSettingsUpdatedAt' | 'remindersUpdatedAt'>;
  setReaderTheme: (theme: ThemeMode, origin?: ThemeTransitionOrigin, snapshotUri?: string | null) => void;
  setPrayerSettings: (patch: Partial<PrayerSettings>) => void;
  upsertReminder: (id: string, patch: Partial<ReminderSetting>) => void;
  setDhikrLoopSettings: (patch: Partial<DhikrLoopSettings>) => void;
  setVibration: (enabled: boolean) => void;
  setQuranFlipSound: (enabled: boolean) => void;
  resetAccountScopedData: () => void;
};

const buildNowIso = () => new Date().toISOString();

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      readerTheme: 'dark',
      themeTransition: initialThemeTransition,
      prayerSettings: defaultPrayerSettings,
      reminders: buildDefaultReminders(),
      dhikrLoopSettings: defaultDhikrLoopSettings,
      vibrationEnabled: true,
      quranFlipSoundEnabled: true,
      syncMetadata: {},
      setReaderTheme: (readerTheme, origin, snapshotUri) =>
        set((state) => {
          if (state.readerTheme === readerTheme) return state;

          return {
            readerTheme,
            themeTransition: {
              id: state.themeTransition.id + 1,
              originX: origin?.x ?? state.themeTransition.originX,
              originY: origin?.y ?? state.themeTransition.originY,
              fromTheme: state.readerTheme,
              toTheme: readerTheme,
              snapshotUri: snapshotUri ?? null,
            },
          };
        }),
      setPrayerSettings: (patch) => {
        const updatedAt = buildNowIso();
        set({
          prayerSettings: normalizePrayerSettings({
            ...get().prayerSettings,
            ...patch,
            updatedAt,
          }),
          syncMetadata: {
            ...get().syncMetadata,
            prayerSettingsUpdatedAt: updatedAt,
          },
        });
      },
      upsertReminder: (id, patch) =>
        set({
          reminders: get().reminders.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                }
              : item,
          ),
          syncMetadata: {
            ...get().syncMetadata,
            remindersUpdatedAt: buildNowIso(),
          },
        }),
      setDhikrLoopSettings: (patch) =>
        set({
          dhikrLoopSettings: {
            ...get().dhikrLoopSettings,
            ...patch,
          },
        }),
      setVibration: (vibrationEnabled) => set({ vibrationEnabled }),
      setQuranFlipSound: (quranFlipSoundEnabled) => set({ quranFlipSoundEnabled }),
      resetAccountScopedData: () =>
        set({
          prayerSettings: defaultPrayerSettings,
          reminders: buildDefaultReminders(),
          dhikrLoopSettings: defaultDhikrLoopSettings,
          syncMetadata: {},
        }),
    }),
    {
      name: 'noor.settings.store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 10,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<SettingsStore> & {
          readerTheme?: ThemeMode | string;
          adhanTestSchedule?: {
            enabled?: boolean;
            times?: Partial<PrayerSettings['manualPrayerTimes']>;
          };
        };
        const normalizedTheme = state.readerTheme === 'light' || state.readerTheme === 'dark'
          ? state.readerTheme
          : 'dark';
        const migratedPrayerSettingsBase = state.prayerSettings
          ? {
              ...state.prayerSettings,
              adhanVoice: normalizeAdhanVoiceId(state.prayerSettings.adhanVoice),
            }
          : defaultPrayerSettings;
        const migratedPrayerSettings =
          state.adhanTestSchedule?.enabled === true
            ? {
                ...migratedPrayerSettingsBase,
                timeMode: 'manual' as const,
                manualPrayerTimes: {
                  ...migratedPrayerSettingsBase.manualPrayerTimes,
                  ...(state.adhanTestSchedule.times ?? {}),
                },
              }
            : migratedPrayerSettingsBase;
        const normalizedPrayerSettings = normalizePrayerSettings(
          migratedPrayerSettings,
        );

        return {
          ...state,
          readerTheme: normalizedTheme,
          themeTransition: initialThemeTransition,
          prayerSettings: normalizedPrayerSettings,
          reminders: mergeReminderDefaults(state.reminders),
          dhikrLoopSettings: {
            ...defaultDhikrLoopSettings,
            ...state.dhikrLoopSettings,
          },
          syncMetadata: state.syncMetadata ?? {},
        } as SettingsStore;
      },
      partialize: (state) => ({
        readerTheme: state.readerTheme,
        prayerSettings: state.prayerSettings,
        reminders: state.reminders,
        dhikrLoopSettings: state.dhikrLoopSettings,
        vibrationEnabled: state.vibrationEnabled,
        quranFlipSoundEnabled: state.quranFlipSoundEnabled,
        syncMetadata: state.syncMetadata,
      }),
    },
  ),
);
