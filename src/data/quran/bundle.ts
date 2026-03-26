export type QuranVerse = {
  id: number;
  verseKey: string;
  verseNumber: number;
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  rubElHizbNumber: number;
  rukuNumber: number | null;
  manzilNumber: number | null;
  text: string;
};

export type QuranChapterSummary = {
  id: number;
  nameAr: string;
  nameSimple: string;
  nameComplex: string;
  translatedName: string;
  translatedNameLanguage: string;
  revelationPlace: string;
  revelationOrder: number;
  versesCount: number;
  bismillahPre: boolean;
  startPage: number;
  endPage: number;
};

export type QuranChapter = QuranChapterSummary & {
  verses: QuranVerse[];
};

export type QuranPageSection = {
  chapterId: number;
  chapterNameAr: string;
  chapterNameSimple: string;
  verses: Array<{
    id: number;
    verseKey: string;
    number: number;
    text: string;
  }>;
};

export type QuranPage = {
  pageNumber: number;
  juzNumber: number;
  hizbNumber: number;
  rubElHizbNumber: number;
  manzilNumber: number | null;
  sections: QuranPageSection[];
};

export type QuranJuzSummary = {
  id: number;
  nameAr: string;
  startPage: number;
  endPage: number;
};

export type QuranSourceInfo = {
  provider: string;
  textScript: string;
  generatedAt: string;
  totalPages: number;
  totalChapters: number;
  notes: string[];
  storage: 'local-files';
};

type QuranPagesBundle = {
  pages: QuranPage[];
  stats: {
    totalPages: number;
    totalVerses: number;
  };
};

type QuranChaptersBundle = {
  chapters: QuranChapter[];
  stats: {
    totalChapters: number;
    totalVerses: number;
    generatedAt: string;
    source: string;
  };
};

const chaptersIndex = require('../../../assets/content/quran/chapters.index.json') as {
  chapters: QuranChapterSummary[];
};

const juzsIndex = require('../../../assets/content/quran/juzs.index.json') as {
  juzs: QuranJuzSummary[];
};

type QuranSourceFile = {
  provider?: string;
  textScript?: string;
  generatedAt?: string;
  totalPages?: number;
  totalChapters?: number;
  notes?: string[];
};

const quranSourceFile = require('../../../assets/content/quran/source.json') as QuranSourceFile;

export const quranChapterSummaries = chaptersIndex.chapters;
export const quranJuzSummaries = juzsIndex.juzs;
const totalPagesFromIndex = quranJuzSummaries.reduce((max, juz) => Math.max(max, juz.endPage), 0);
const totalPages = totalPagesFromIndex || quranSourceFile.totalPages || 604;
const totalChapters = quranChapterSummaries.length || quranSourceFile.totalChapters || 114;
const sourceNotes = Array.isArray(quranSourceFile.notes) ? quranSourceFile.notes : [];

export const quranSourceInfo: QuranSourceInfo = {
  provider: quranSourceFile.provider ?? 'Quran Local Bundle',
  textScript: quranSourceFile.textScript ?? 'uthmani',
  generatedAt: quranSourceFile.generatedAt ?? '',
  totalPages,
  totalChapters,
  notes: [...sourceNotes, 'Runtime source is local files only.'],
  storage: 'local-files',
};

export const quranBundleStats = {
  totalPages,
  totalVerses: quranChapterSummaries.reduce((sum, chapter) => sum + chapter.versesCount, 0),
};

let pagesBundleCache: QuranPagesBundle | null = null;
let pageMapCache: Map<number, QuranPage> | null = null;
let chaptersBundleCache: QuranChaptersBundle | null = null;
let chapterContentMapCache: Map<number, QuranChapter> | null = null;

const chapterSummaryMap = new Map(quranChapterSummaries.map((chapter) => [chapter.id, chapter]));
const juzSummaryMap = new Map(quranJuzSummaries.map((juz) => [juz.id, juz]));

const getPagesBundle = () => {
  if (!pagesBundleCache) {
    pagesBundleCache = require('../../../assets/content/quran/pages.bundle.json') as QuranPagesBundle;
  }
  return pagesBundleCache;
};

const getPageMap = () => {
  if (!pageMapCache) {
    pageMapCache = new Map(getPagesBundle().pages.map((page) => [page.pageNumber, page]));
  }
  return pageMapCache;
};

const getChaptersBundle = () => {
  if (!chaptersBundleCache) {
    chaptersBundleCache = require('../../../assets/content/quran/chapters.bundle.json') as QuranChaptersBundle;
  }
  return chaptersBundleCache;
};

const getChapterContentMap = () => {
  if (!chapterContentMapCache) {
    chapterContentMapCache = new Map(getChaptersBundle().chapters.map((chapter) => [chapter.id, chapter]));
  }
  return chapterContentMapCache;
};

export const getQuranPage = (pageNumber: number) => getPageMap().get(pageNumber);

export const getQuranChapterSummary = (chapterId: number) => chapterSummaryMap.get(chapterId);

export const getQuranChapter = (chapterId: number) => getChapterContentMap().get(chapterId);

export const getQuranJuzSummary = (juzId: number) => juzSummaryMap.get(juzId);

export const isQuranPageAvailable = (pageNumber: number) => getPageMap().has(pageNumber);

export const quranBundleInfo = {
  pagesIncluded: Array.from({ length: totalPages }, (_, index) => index + 1),
  version: `${quranSourceInfo.provider.toLowerCase().replace(/\s+/g, '-')}-${quranSourceInfo.textScript}-local`,
  generatedAt: quranSourceInfo.generatedAt,
  provider: quranSourceInfo.provider,
  storage: quranSourceInfo.storage,
};
