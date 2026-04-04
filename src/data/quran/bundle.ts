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

type CompactQuranVerse = [
  id: number,
  verseKey: string,
  verseNumber: number,
  pageNumber: number,
  juzNumber: number,
  hizbNumber: number,
  rubElHizbNumber: number,
  rukuNumber: number | null,
  manzilNumber: number | null,
  text: string,
];

type CompactQuranChapter = [
  id: number,
  nameAr: string,
  nameSimple: string,
  nameComplex: string,
  translatedName: string,
  translatedNameLanguage: string,
  revelationPlace: string,
  revelationOrder: number,
  versesCount: number,
  bismillahPre: number,
  startPage: number,
  endPage: number,
  verses: CompactQuranVerse[],
];

type CompactQuranPageVerse = [id: number, verseKey: string, number: number, text: string];
type CompactQuranPageSection = [
  chapterId: number,
  chapterNameAr: string,
  chapterNameSimple: string,
  verses: CompactQuranPageVerse[],
];
type CompactQuranPage = [
  pageNumber: number,
  juzNumber: number,
  hizbNumber: number,
  rubElHizbNumber: number,
  manzilNumber: number | null,
  sections: CompactQuranPageSection[],
];

type CompactQuranPagesBundle = {
  pages: CompactQuranPage[];
  stats: [totalPages: number, totalVerses: number];
};

type CompactQuranChaptersBundle = {
  chapters: CompactQuranChapter[];
  stats: [totalChapters: number, totalVerses: number, generatedAt: string, source: string];
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

const decodeCompactVerse = (verse: CompactQuranVerse): QuranVerse => ({
  id: verse[0],
  verseKey: verse[1],
  verseNumber: verse[2],
  pageNumber: verse[3],
  juzNumber: verse[4],
  hizbNumber: verse[5],
  rubElHizbNumber: verse[6],
  rukuNumber: verse[7],
  manzilNumber: verse[8],
  text: verse[9],
});

const decodeCompactChapter = (chapter: CompactQuranChapter): QuranChapter => ({
  id: chapter[0],
  nameAr: chapter[1],
  nameSimple: chapter[2],
  nameComplex: chapter[3],
  translatedName: chapter[4],
  translatedNameLanguage: chapter[5],
  revelationPlace: chapter[6],
  revelationOrder: chapter[7],
  versesCount: chapter[8],
  bismillahPre: chapter[9] === 1,
  startPage: chapter[10],
  endPage: chapter[11],
  verses: chapter[12].map(decodeCompactVerse),
});

const decodeCompactPage = (page: CompactQuranPage): QuranPage => ({
  pageNumber: page[0],
  juzNumber: page[1],
  hizbNumber: page[2],
  rubElHizbNumber: page[3],
  manzilNumber: page[4],
  sections: page[5].map((section) => ({
    chapterId: section[0],
    chapterNameAr: section[1],
    chapterNameSimple: section[2],
    verses: section[3].map((verse) => ({
      id: verse[0],
      verseKey: verse[1],
      number: verse[2],
      text: verse[3],
    })),
  })),
});

const getPagesBundle = () => {
  if (!pagesBundleCache) {
    const rawBundle = require('../../../assets/content/quran/pages.compact.json') as CompactQuranPagesBundle;
    pagesBundleCache = {
      pages: rawBundle.pages.map(decodeCompactPage),
      stats: {
        totalPages: rawBundle.stats[0],
        totalVerses: rawBundle.stats[1],
      },
    };
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
    const rawBundle = require('../../../assets/content/quran/chapters.compact.json') as CompactQuranChaptersBundle;
    chaptersBundleCache = {
      chapters: rawBundle.chapters.map(decodeCompactChapter),
      stats: {
        totalChapters: rawBundle.stats[0],
        totalVerses: rawBundle.stats[1],
        generatedAt: rawBundle.stats[2],
        source: rawBundle.stats[3],
      },
    };
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
