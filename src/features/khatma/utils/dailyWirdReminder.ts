import i18n from '@/i18n';
import { surahList } from '@/constants/quran';
import { getLocalQuranPage } from '@/data/quran/localPages';
import { useAuthStore } from '@/state/authStore';
import { useKhatmaStore } from '@/state/khatmaStore';
import { formatNumber } from '@/utils/number';

type AppLang = 'ar' | 'en';

const getLocalizedNumber = (value: number, lang: AppLang) => {
  const numberFormat = useAuthStore.getState().numberFormat;
  const preferredFormat = numberFormat === 'english' ? 'english' : numberFormat === 'arabic' ? 'arabic' : lang === 'ar' ? 'arabic' : 'english';
  return formatNumber(value, preferredFormat);
};

const getPageAnchor = (pageNumber: number, edge: 'start' | 'end') => {
  const page = getLocalQuranPage(pageNumber);
  if (!page || page.sections.length === 0) return null;

  const section = edge === 'start' ? page.sections[0] : page.sections[page.sections.length - 1];
  const ayah = edge === 'start' ? section.ayahs[0] : section.ayahs[section.ayahs.length - 1];
  if (!section || !ayah) return null;

  const surah = surahList.find((item) => item.id === section.surahId);
  return {
    surahId: section.surahId,
    surahNameAr: section.surahNameAr || surah?.nameAr || '',
    surahNameEn: surah?.nameEn || surah?.translatedName || section.surahNameAr,
    ayahNumber: ayah.number,
  };
};

export const getDailyWirdReminderBody = (lang: AppLang) => {
  const khatma = useKhatmaStore.getState().activeKhatma;
  if (!khatma) {
    return i18n.t('reminders.dailyWirdRangeFallback', { lng: lang });
  }

  if (khatma.status === 'completed' || khatma.currentPage >= khatma.endPage) {
    return i18n.t('reminders.dailyWirdCompletedBody', { lng: lang });
  }

  const startPage = Math.max(1, khatma.currentPage);
  const endPage = Math.min(khatma.endPage, khatma.currentPage + khatma.dailyPages - 1);
  const start = getPageAnchor(startPage, 'start');
  const end = getPageAnchor(endPage, 'end');

  if (start && end) {
    const startAyah = getLocalizedNumber(start.ayahNumber, lang);
    const endAyah = getLocalizedNumber(end.ayahNumber, lang);
    const startSurah = lang === 'ar' ? start.surahNameAr : start.surahNameEn;
    const endSurah = lang === 'ar' ? end.surahNameAr : end.surahNameEn;

    if (start.surahId === end.surahId) {
      return i18n.t('reminders.dailyWirdRangeSameSurah', {
        lng: lang,
        surah: startSurah,
        startAyah,
        endAyah,
      });
    }

    return i18n.t('reminders.dailyWirdRangeCrossSurah', {
      lng: lang,
      startSurah,
      startAyah,
      endSurah,
      endAyah,
    });
  }

  return i18n.t('reminders.dailyWirdRangePages', {
    lng: lang,
    startPage: getLocalizedNumber(startPage, lang),
    endPage: getLocalizedNumber(endPage, lang),
  });
};
