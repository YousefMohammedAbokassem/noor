import i18n from 'i18next';
import * as Localization from 'expo-localization';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import ar from './locales/ar';
import en from './locales/en';

export const resources = {
  ar: { translation: ar },
  en: { translation: en },
} as const;

const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'ar';
const fallback = deviceLang === 'ar' ? 'ar' : 'en';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: fallback,
    fallbackLng: 'ar',
    compatibilityJSON: 'v4',
    interpolation: { escapeValue: false },
  });
}

export const setLanguage = async (lang: 'ar' | 'en') => {
  await i18n.changeLanguage(lang);
  // The app already controls layout direction explicitly per-screen/per-component.
  // Keeping RN's global RTL mirroring enabled causes Android to double-flip layouts.
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);
  I18nManager.swapLeftAndRightInRTL(false);
};

export default i18n;
