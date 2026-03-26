import { localTafsirEntries, type LocalVerseTafsirData } from '../data/localTafsir';
import { tafsirMuyassarGeneratedEntries } from '../data/tafsirMuyassar.generated';

export type VerseTafsirData = LocalVerseTafsirData;

const offlineTafsirEntries: Record<string, LocalVerseTafsirData> = {
  ...tafsirMuyassarGeneratedEntries,
  ...localTafsirEntries,
};

export const getVerseTafsir = (surahId: number, ayahNumber: number): VerseTafsirData | null =>
  offlineTafsirEntries[`${surahId}:${ayahNumber}`] ?? null;
