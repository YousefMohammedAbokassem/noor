import { create } from 'zustand';

type QuranUiStore = {
  surahSearchQuery: string;
  setSurahSearchQuery: (value: string) => void;
  clearSurahSearchQuery: () => void;
};

export const useQuranUiStore = create<QuranUiStore>((set) => ({
  surahSearchQuery: '',
  setSurahSearchQuery: (value) => set({ surahSearchQuery: value }),
  clearSurahSearchQuery: () => set({ surahSearchQuery: '' }),
}));
