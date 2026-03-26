import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TasbeehStore = {
  count: number;
  target: number;
  history: number[];
  increment: () => void;
  undo: () => void;
  reset: () => void;
  setTarget: (target: number) => void;
};

export const useTasbeehStore = create<TasbeehStore>()(
  persist(
    (set, get) => ({
      count: 0,
      target: 33,
      history: [],
      increment: () => set({ count: get().count + 1, history: [...get().history, get().count] }),
      undo: () => {
        const previous = get().history[get().history.length - 1];
        if (previous === undefined) return;
        set({ count: previous, history: get().history.slice(0, -1) });
      },
      reset: () => set({ count: 0, history: [] }),
      setTarget: (target) => set({ target }),
    }),
    {
      name: 'noor.tasbeeh.store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
