import { quranBundleStats, quranChapterSummaries, quranJuzSummaries } from '@/data/quran';

export const TOTAL_QURAN_PAGES = quranBundleStats.totalPages;

export const juzList = quranJuzSummaries.map((juz) => ({
  id: juz.id,
  nameAr: juz.nameAr,
  nameEn: `Juz ${juz.id}`,
  startPage: juz.startPage,
  endPage: juz.endPage,
}));

export const surahList = quranChapterSummaries.map((chapter) => ({
  id: chapter.id,
  nameAr: chapter.nameAr,
  nameEn: chapter.nameSimple,
  translatedName: chapter.translatedName,
  revelationPlace: chapter.revelationPlace,
  versesCount: chapter.versesCount,
  startPage: chapter.startPage,
  endPage: chapter.endPage,
  juz: quranJuzSummaries.find(
    (juz) => chapter.startPage >= juz.startPage && chapter.startPage <= juz.endPage,
  )?.id ?? 1,
}));
