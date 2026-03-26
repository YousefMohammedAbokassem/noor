import { getQuranPage, quranBundleInfo } from './bundle';

export type LocalAyah = {
  number: number;
  text: string;
};

export type LocalQuranSection = {
  surahId: number;
  surahNameAr: string;
  ayahs: LocalAyah[];
};

export type LocalQuranPage = {
  page: number;
  juz: number;
  sections: LocalQuranSection[];
};

const localPageCache = new Map<number, LocalQuranPage>();

const toLocalQuranPage = (pageNumber: number): LocalQuranPage | undefined => {
  if (localPageCache.has(pageNumber)) {
    return localPageCache.get(pageNumber);
  }

  const page = getQuranPage(pageNumber);
  if (!page) return undefined;

  const mapped: LocalQuranPage = {
    page: page.pageNumber,
    juz: page.juzNumber,
    sections: page.sections.map((section) => ({
      surahId: section.chapterId,
      surahNameAr: section.chapterNameAr,
      ayahs: section.verses.map((verse) => ({
        number: verse.number,
        text: verse.text,
      })),
    })),
  };

  localPageCache.set(pageNumber, mapped);
  return mapped;
};

const buildLocalPagesAccessor = () => {
  const pages = {} as Record<number, LocalQuranPage>;

  for (const pageNumber of quranBundleInfo.pagesIncluded) {
    Object.defineProperty(pages, pageNumber, {
      enumerable: true,
      configurable: false,
      get: () => toLocalQuranPage(pageNumber),
    });
  }

  return Object.freeze(pages) as Record<number, LocalQuranPage>;
};

export const localQuranPages = buildLocalPagesAccessor();

export const getLocalQuranPage = (pageNumber: number) => toLocalQuranPage(pageNumber);

export const localQuranBundleInfo = {
  pagesIncluded: quranBundleInfo.pagesIncluded,
  version: quranBundleInfo.version,
  storage: quranBundleInfo.storage,
};
