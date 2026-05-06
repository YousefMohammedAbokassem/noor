import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrayerRuntimeHealth, PrayerTimes } from '@/types/models';
import { storage } from '@/services/storage';

const defaultRuntimeHealth: PrayerRuntimeHealth = {
  state: 'attention',
  scheduledCount: 0,
  notificationPermissionGranted: false,
  locationPermissionGranted: null,
  backgroundTaskRegistered: false,
  issues: ['cache_missing'],
};

type PrayerStore = {
  prayerTimes: PrayerTimes | null;
  isLocationGranted: boolean;
  runtimeHealth: PrayerRuntimeHealth;
  updatePrayerTimes: (times: PrayerTimes) => void;
  setLocationGranted: (granted: boolean) => void;
  setRuntimeHealth: (runtimeHealth: PrayerRuntimeHealth) => void;
  resetAccountScopedData: () => void;
};

export const usePrayerStore = create<PrayerStore>()(
  persist(
    (set) => ({
      prayerTimes: null,
      isLocationGranted: false,
      runtimeHealth: defaultRuntimeHealth,
      updatePrayerTimes: (prayerTimes) => set({ prayerTimes }),
      setLocationGranted: (isLocationGranted) => set({ isLocationGranted }),
      setRuntimeHealth: (runtimeHealth) => set({ runtimeHealth }),
      resetAccountScopedData: () =>
        set({
          prayerTimes: null,
          isLocationGranted: false,
          runtimeHealth: defaultRuntimeHealth,
        }),
    }),
    {
      name: storage.keys.prayerStore,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
