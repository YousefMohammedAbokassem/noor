import { getQuranPage, isQuranPageAvailable, quranBundleInfo } from './bundle';

export const getLocalQuranPage = (page: number) => getQuranPage(page);

export const isPageIncludedLocally = (page: number) => isQuranPageAvailable(page);

export { quranBundleInfo as localQuranBundleInfo };

export {
  getQuranChapter,
  getQuranChapterSummary,
  getQuranJuzSummary,
  quranBundleStats,
  quranChapterSummaries,
  quranJuzSummaries,
  quranSourceInfo,
} from './bundle';

export type {
  QuranChapter,
  QuranChapterSummary,
  QuranJuzSummary,
  QuranPage,
  QuranPageSection,
  QuranSourceInfo,
  QuranVerse,
} from './bundle';
