import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Language, NumberFormat, User } from '@/types/models';
import { storage } from '@/services/storage';

export type AuthStore = {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isOnboardingDone: boolean;
  language: Language;
  numberFormat: NumberFormat;
  setLanguage: (lang: Language) => void;
  setNumberFormat: (format: NumberFormat) => void;
  completeOnboarding: () => void;
  login: (user: User) => void;
  continueAsGuest: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isGuest: false,
      isOnboardingDone: false,
      language: 'ar',
      numberFormat: 'arabic',
      setLanguage: (language) => set({ language }),
      setNumberFormat: (numberFormat) => set({ numberFormat }),
      completeOnboarding: () => set({ isOnboardingDone: true }),
      login: (user) => set({ user, isAuthenticated: true, isGuest: false, isOnboardingDone: true }),
      continueAsGuest: () => set({ user: null, isAuthenticated: false, isGuest: true, isOnboardingDone: true }),
      logout: () => set({ user: null, isAuthenticated: false, isGuest: false }),
    }),
    {
      name: storage.keys.authStore,
      storage: createJSONStorage(() => storage.securePersistStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuest: state.isGuest,
        isOnboardingDone: state.isOnboardingDone,
        language: state.language,
        numberFormat: state.numberFormat,
      }),
    },
  ),
);
