import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeAdhanVoiceId } from '@/constants/adhan';
import { AdhanTestSchedule, DhikrLoopSettings, PrayerSettings, ReminderSetting, SyncMetadata, ThemeMode } from '@/types/models';
import {
  defaultAdhanTestSchedule,
  defaultPrayerSettings,
  normalizeAdhanTestSchedule,
  normalizePrayerSettings,
} from '@/services/prayer/defaults';

const baseReminders: ReminderSetting[] = [
  { id: 'wird', type: 'wird', enabled: true, time: '08:00' },
  { id: 'morning_adhkar', type: 'morning_adhkar', enabled: true, time: '06:30' },
  { id: 'evening_adhkar', type: 'evening_adhkar', enabled: true, time: '18:00' },
  { id: 'mulk', type: 'mulk', enabled: false, time: '21:00' },
  { id: 'kahf', type: 'kahf', enabled: false, time: '09:00' },
  { id: 'baqarah', type: 'baqarah', enabled: false, time: '17:00' },
];

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
  adhanTestSchedule: AdhanTestSchedule;
  reminders: ReminderSetting[];
  dhikrLoopSettings: DhikrLoopSettings;
  vibrationEnabled: boolean;
  quranFlipSoundEnabled: boolean;
  syncMetadata: Pick<SyncMetadata, 'prayerSettingsUpdatedAt' | 'remindersUpdatedAt'>;
  setReaderTheme: (theme: ThemeMode, origin?: ThemeTransitionOrigin, snapshotUri?: string | null) => void;
  setPrayerSettings: (patch: Partial<PrayerSettings>) => void;
  setAdhanTestSchedule: (patch: Partial<AdhanTestSchedule>) => void;
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
      adhanTestSchedule: defaultAdhanTestSchedule,
      reminders: baseReminders,
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
      setAdhanTestSchedule: (patch) =>
        set({
          adhanTestSchedule: normalizeAdhanTestSchedule({
            ...get().adhanTestSchedule,
            ...patch,
            times: {
              ...get().adhanTestSchedule.times,
              ...(patch.times ?? {}),
            },
          }),
        }),
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
          adhanTestSchedule: defaultAdhanTestSchedule,
          reminders: baseReminders,
          dhikrLoopSettings: defaultDhikrLoopSettings,
          syncMetadata: {},
        }),
    }),
    {
      name: 'noor.settings.store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 8,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<SettingsStore> & {
          readerTheme?: ThemeMode | string;
        };
        const normalizedTheme = state.readerTheme === 'light' || state.readerTheme === 'dark'
          ? state.readerTheme
          : 'dark';
        const normalizedPrayerSettings = normalizePrayerSettings(
          state.prayerSettings
            ? {
                ...state.prayerSettings,
                adhanVoice: normalizeAdhanVoiceId(state.prayerSettings.adhanVoice),
              }
            : defaultPrayerSettings,
        );

        return {
          ...state,
          readerTheme: normalizedTheme,
          themeTransition: initialThemeTransition,
          prayerSettings: normalizedPrayerSettings,
          adhanTestSchedule: normalizeAdhanTestSchedule(state.adhanTestSchedule),
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
        adhanTestSchedule: state.adhanTestSchedule,
        reminders: state.reminders,
        dhikrLoopSettings: state.dhikrLoopSettings,
        vibrationEnabled: state.vibrationEnabled,
        quranFlipSoundEnabled: state.quranFlipSoundEnabled,
        syncMetadata: state.syncMetadata,
      }),
    },
  ),
);
