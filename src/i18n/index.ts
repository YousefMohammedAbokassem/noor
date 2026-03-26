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
  const shouldUseRTL = lang === 'ar';

  I18nManager.allowRTL(shouldUseRTL);
  I18nManager.forceRTL(shouldUseRTL);
  I18nManager.swapLeftAndRightInRTL(true);
};

export default i18n;
