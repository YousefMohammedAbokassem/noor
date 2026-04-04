// Build-time only script to generate local Quran JSON bundles.
// It must never be imported or executed by the mobile app runtime.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'https://api.quran.com/api/v4';
const TEXT_SCRIPT = 'uthmani';
const FETCHED_AT = new Date().toISOString();
const ITEMS_PER_REQUEST = 50;
const TOTAL_PAGES = 604;

const outputDir = path.resolve(__dirname, '../assets/content/quran');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchJson = async (url, attempt = 1) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'noor-al-hayah-mobile/1.0 data-sync',
    },
  });

  if (!response.ok) {
    if (attempt < 4 && (response.status >= 500 || response.status === 429)) {
      await wait(500 * attempt);
      return fetchJson(url, attempt + 1);
    }

    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
};

const writeJson = (filePath, value) =>
  writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');

const getTextField = () => {
  if (TEXT_SCRIPT === 'uthmani') {
    return 'text_uthmani';
  }

  if (TEXT_SCRIPT === 'imlaei') {
    return 'text_imlaei';
  }

  throw new Error(`Unsupported text script: ${TEXT_SCRIPT}`);
};

const toChapterSummary = (chapter) => ({
  id: chapter.id,
  nameAr: chapter.name_arabic,
  nameSimple: chapter.name_simple,
  nameComplex: chapter.name_complex,
  translatedName: chapter.translated_name?.name ?? chapter.name_simple,
  translatedNameLanguage: chapter.translated_name?.language_name ?? 'unknown',
  revelationPlace: chapter.revelation_place,
  revelationOrder: chapter.revelation_order,
  versesCount: chapter.verses_count,
  bismillahPre: chapter.bismillah_pre,
  startPage: chapter.pages[0],
  endPage: chapter.pages[1],
});

const buildPageBundle = (chapters) => {
  const pageMap = new Map();

  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      const currentPage =
        pageMap.get(verse.pageNumber) ??
        {
          pageNumber: verse.pageNumber,
          juzNumber: verse.juzNumber,
          hizbNumber: verse.hizbNumber,
          rubElHizbNumber: verse.rubElHizbNumber,
          manzilNumber: verse.manzilNumber,
          sections: [],
        };

      let section = currentPage.sections.find((item) => item.chapterId === chapter.id);

      if (!section) {
        section = {
          chapterId: chapter.id,
          chapterNameAr: chapter.nameAr,
          chapterNameSimple: chapter.nameSimple,
          verses: [],
        };
        currentPage.sections.push(section);
      }

      section.verses.push({
        id: verse.id,
        verseKey: verse.verseKey,
        number: verse.verseNumber,
        text: verse.text,
      });

      pageMap.set(verse.pageNumber, currentPage);
    }
  }

  const pages = [];

  for (let pageNumber = 1; pageNumber <= TOTAL_PAGES; pageNumber += 1) {
    const page = pageMap.get(pageNumber);

    if (!page) {
      throw new Error(`Missing Quran page ${pageNumber} while building bundle.`);
    }

    pages.push(page);
  }

  return pages;
};

const buildCompactChaptersBundle = (chapters) => ({
  chapters: chapters.map((chapter) => [
    chapter.id,
    chapter.nameAr,
    chapter.nameSimple,
    chapter.nameComplex,
    chapter.translatedName,
    chapter.translatedNameLanguage,
    chapter.revelationPlace,
    chapter.revelationOrder,
    chapter.versesCount,
    chapter.bismillahPre ? 1 : 0,
    chapter.startPage,
    chapter.endPage,
    chapter.verses.map((verse) => [
      verse.id,
      verse.verseKey,
      verse.verseNumber,
      verse.pageNumber,
      verse.juzNumber,
      verse.hizbNumber,
      verse.rubElHizbNumber,
      verse.rukuNumber,
      verse.manzilNumber,
      verse.text,
    ]),
  ]),
  stats: [
    chapters.length,
    chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0),
    FETCHED_AT,
    'quran-foundation-api',
  ],
});

const buildCompactPagesBundle = (pages, totalVerses) => ({
  pages: pages.map((page) => [
    page.pageNumber,
    page.juzNumber,
    page.hizbNumber,
    page.rubElHizbNumber,
    page.manzilNumber,
    page.sections.map((section) => [
      section.chapterId,
      section.chapterNameAr,
      section.chapterNameSimple,
      section.verses.map((verse) => [verse.id, verse.verseKey, verse.number, verse.text]),
    ]),
  ]),
  stats: [TOTAL_PAGES, totalVerses],
});

const buildJuzIndex = (pages) => {
  const juzMap = new Map();

  for (const page of pages) {
    const current =
      juzMap.get(page.juzNumber) ??
      {
        id: page.juzNumber,
        nameAr: `الجزء ${page.juzNumber}`,
        startPage: page.pageNumber,
        endPage: page.pageNumber,
      };

    current.startPage = Math.min(current.startPage, page.pageNumber);
    current.endPage = Math.max(current.endPage, page.pageNumber);
    juzMap.set(page.juzNumber, current);
  }

  return Array.from(juzMap.values()).sort((a, b) => a.id - b.id);
};

const fetchChapterVerses = async (chapter) => {
  const totalApiPages = Math.ceil(chapter.versesCount / ITEMS_PER_REQUEST);
  const verseTextField = getTextField();
  const verses = [];

  for (let apiPage = 1; apiPage <= totalApiPages; apiPage += 1) {
    const metaUrl = `${API_BASE_URL}/verses/by_chapter/${chapter.id}?language=ar&words=false&per_page=${ITEMS_PER_REQUEST}&page=${apiPage}`;
    const textUrl = `${API_BASE_URL}/quran/verses/${TEXT_SCRIPT}?chapter_number=${chapter.id}&per_page=${ITEMS_PER_REQUEST}&page=${apiPage}`;

    const [metaResponse, textResponse] = await Promise.all([fetchJson(metaUrl), fetchJson(textUrl)]);

    const textByVerseKey = new Map(
      textResponse.verses.map((verse) => [verse.verse_key, verse[verseTextField]]),
    );

    for (const verse of metaResponse.verses) {
      const text = textByVerseKey.get(verse.verse_key);

      if (!text) {
        throw new Error(`Missing text for verse ${verse.verse_key}.`);
      }

      verses.push({
        id: verse.id,
        verseKey: verse.verse_key,
        verseNumber: verse.verse_number,
        pageNumber: verse.page_number,
        juzNumber: verse.juz_number,
        hizbNumber: verse.hizb_number,
        rubElHizbNumber: verse.rub_el_hizb_number,
        rukuNumber: verse.ruku_number,
        manzilNumber: verse.manzil_number,
        text,
      });
    }
  }

  if (verses.length !== chapter.versesCount) {
    throw new Error(
      `Verse count mismatch for chapter ${chapter.id}. Expected ${chapter.versesCount}, got ${verses.length}.`,
    );
  }

  return verses;
};

const main = async () => {
  console.log('Fetching Quran chapter index from Quran Foundation API...');
  const chapterResponse = await fetchJson(`${API_BASE_URL}/chapters?language=ar`);
  const chapterSummaries = chapterResponse.chapters.map(toChapterSummary);

  await mkdir(outputDir, { recursive: true });
  const chapters = [];

  for (const chapter of chapterSummaries) {
    console.log(`Downloading chapter ${chapter.id}/${chapterSummaries.length}: ${chapter.nameAr}`);
    const verses = await fetchChapterVerses(chapter);
    const chapterPayload = {
      ...chapter,
      verses,
    };

    chapters.push(chapterPayload);
  }

  const pages = buildPageBundle(chapters);
  const juzs = buildJuzIndex(pages);
  const totalVerses = chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0);

  const source = {
    provider: 'Quran Foundation',
    apiBaseUrl: API_BASE_URL,
    textScript: TEXT_SCRIPT,
    documentationUrl: 'https://api-docs.quran.com/docs/content_apis_versioned/quran-verses-by-script/',
    chaptersEndpoint: `${API_BASE_URL}/chapters?language=ar`,
    generatedAt: FETCHED_AT,
    totalPages: TOTAL_PAGES,
    totalChapters: chapterSummaries.length,
    notes: [
      'The Quran text was fetched from the official Quran Foundation API.',
      'Chapter metadata, page numbers, and juz structure were generated during sync.',
    ],
  };

  await writeJson(path.join(outputDir, 'source.json'), source);
  await writeJson(path.join(outputDir, 'chapters.index.json'), { chapters: chapterSummaries });
  await writeJson(path.join(outputDir, 'chapters.compact.json'), buildCompactChaptersBundle(chapters));
  await writeJson(path.join(outputDir, 'juzs.index.json'), { juzs });
  await writeJson(path.join(outputDir, 'pages.compact.json'), buildCompactPagesBundle(pages, totalVerses));

  console.log('Quran data sync completed successfully.');
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
