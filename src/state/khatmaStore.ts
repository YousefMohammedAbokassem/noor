import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bookmark, Khatma, KhatmaStartType, ReadingProgress, SyncMetadata } from '@/types/models';
import { TOTAL_QURAN_PAGES } from '@/constants/quran';

type KhatmaStore = {
  activeKhatma: Khatma | null;
  readingProgress: ReadingProgress;
  bookmarks: Bookmark[];
  pinnedMarker: { page: number; surah: number; verse: number; title?: string; createdAt: string } | null;
  syncMetadata: Pick<SyncMetadata, 'khatmaUpdatedAt' | 'readingProgressUpdatedAt' | 'bookmarksUpdatedAt'>;
  createKhatma: (input: {
    startType: KhatmaStartType;
    startPage: number;
    durationDays?: number;
    dailyPages?: number;
  }) => void;
  completeDailyWird: () => void;
  updateReadingProgress: (page: number, surah: number, juz: number) => void;
  addBookmark: (page: number, surah: number, title?: string) => void;
  togglePinnedMarker: (input: { page: number; surah: number; verse: number; title?: string }) => void;
  resetAccountScopedData: () => void;
};

const buildDefaultReadingProgress = (): ReadingProgress => ({
  currentPage: 1,
  currentSurah: 1,
  currentJuz: 1,
  lastReadAt: new Date().toISOString(),
});

const buildNowIso = () => new Date().toISOString();

const getStatus = (currentPage: number, expectedPage: number): Khatma['trackStatus'] => {
  if (currentPage > expectedPage + 2) return 'ahead';
  if (currentPage < expectedPage - 2) return 'behind';
  return 'onTrack';
};

export const useKhatmaStore = create<KhatmaStore>()(
  persist(
    (set, get) => ({
      activeKhatma: null,
      readingProgress: buildDefaultReadingProgress(),
      bookmarks: [],
      pinnedMarker: null,
      syncMetadata: {},
      createKhatma: ({ startType, startPage, durationDays = 30, dailyPages }) => {
        const pagesRemaining = TOTAL_QURAN_PAGES - startPage + 1;
        const computedDailyPages = dailyPages ?? Math.max(1, Math.ceil(pagesRemaining / durationDays));
        const computedDuration = dailyPages ? Math.ceil(pagesRemaining / dailyPages) : durationDays;
        const now = buildNowIso();

        const khatma: Khatma = {
          id: `khatma-${Date.now()}`,
          startType,
          startPage,
          endPage: TOTAL_QURAN_PAGES,
          dailyPages: computedDailyPages,
          durationDays: computedDuration,
          startedAt: now,
          status: 'active',
          currentPage: startPage,
          completionPercent: Math.round(((startPage - 1) / TOTAL_QURAN_PAGES) * 100),
          trackStatus: 'onTrack',
          updatedAt: now,
        };
        set({
          activeKhatma: khatma,
          readingProgress: {
            ...get().readingProgress,
            currentPage: startPage,
            lastReadAt: now,
            updatedAt: now,
          },
          syncMetadata: {
            ...get().syncMetadata,
            khatmaUpdatedAt: now,
            readingProgressUpdatedAt: now,
          },
        });
      },
      completeDailyWird: () => {
        const current = get().activeKhatma;
        if (!current) return;
        const now = buildNowIso();

        const nextPage = Math.min(TOTAL_QURAN_PAGES, current.currentPage + current.dailyPages);
        const daysPassed = Math.max(
          1,
          Math.ceil((Date.now() - new Date(current.startedAt).getTime()) / (24 * 60 * 60 * 1000)),
        );
        const expectedPage = current.startPage + daysPassed * current.dailyPages;

        const updated: Khatma = {
          ...current,
          currentPage: nextPage,
          completionPercent: Math.round((nextPage / TOTAL_QURAN_PAGES) * 100),
          trackStatus: getStatus(nextPage, expectedPage),
          status: nextPage >= current.endPage ? 'completed' : 'active',
          updatedAt: now,
        };

        set({
          activeKhatma: updated,
          readingProgress: {
            ...get().readingProgress,
            currentPage: nextPage,
            lastReadAt: now,
            updatedAt: now,
          },
          syncMetadata: {
            ...get().syncMetadata,
            khatmaUpdatedAt: now,
            readingProgressUpdatedAt: now,
          },
        });
      },
      updateReadingProgress: (page, surah, juz) => {
        const now = buildNowIso();
        set({
          readingProgress: {
            currentPage: page,
            currentSurah: surah,
            currentJuz: juz,
            lastReadAt: now,
            updatedAt: now,
          },
          syncMetadata: {
            ...get().syncMetadata,
            readingProgressUpdatedAt: now,
          },
        });
      },
      addBookmark: (page, surah, title) => {
        const now = buildNowIso();
        const item = {
          id: `bm-${Date.now()}`,
          page,
          surah,
          title,
          createdAt: now,
          updatedAt: now,
        };
        set({
          bookmarks: [item, ...get().bookmarks],
          syncMetadata: {
            ...get().syncMetadata,
            bookmarksUpdatedAt: now,
          },
        });
      },
      togglePinnedMarker: ({ page, surah, verse, title }) => {
        const current = get().pinnedMarker;
        const isSame =
          current &&
          current.page === page &&
          current.surah === surah &&
          current.verse === verse;

        if (isSame) {
          set({ pinnedMarker: null });
          return;
        }

        set({
          pinnedMarker: {
            page,
            surah,
            verse,
            title,
            createdAt: buildNowIso(),
          },
        });
      },
      resetAccountScopedData: () =>
        set({
          activeKhatma: null,
          readingProgress: buildDefaultReadingProgress(),
          bookmarks: [],
          pinnedMarker: null,
          syncMetadata: {},
        }),
    }),
    {
      name: 'noor.khatma.store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
