import Constants from 'expo-constants';
import { PrayerDaySchedule } from '@/types/models';
import { storage } from '@/services/storage';
import { prayerLogger } from '@/services/prayer/logger';

const STORAGE_KEY = 'noor.prayer.runtime.cache.v1';
const SCHEMA_VERSION = 1;

type RepairState = {
  lastRepairAt?: string;
  lastRepairReason?: string;
  lastKnownTimeZone?: string;
  lastKnownUtcOffsetMinutes?: number;
  scheduledUntil?: string;
  scheduledCount?: number;
};

type StoredPrayerRuntimeState = {
  schemaVersion: number;
  appVersion: string;
  prayerDays: Record<string, PrayerDaySchedule>;
  repairState: RepairState;
};

const buildDefaultState = (): StoredPrayerRuntimeState => ({
  schemaVersion: SCHEMA_VERSION,
  appVersion: Constants.expoConfig?.version ?? '1.0.0',
  prayerDays: {},
  repairState: {},
});

const sanitizePrayerDay = (value: PrayerDaySchedule): PrayerDaySchedule => ({
  ...value,
  source: value.source ?? 'cache',
});

export class PrayerTimesRepository {
  private async loadState(): Promise<StoredPrayerRuntimeState> {
    const raw = await storage.getItem<StoredPrayerRuntimeState>(STORAGE_KEY);
    if (!raw || raw.schemaVersion !== SCHEMA_VERSION || typeof raw !== 'object') {
      return buildDefaultState();
    }

    return {
      ...buildDefaultState(),
      ...raw,
      prayerDays: Object.fromEntries(
        Object.entries(raw.prayerDays ?? {}).map(([key, value]) => [key, sanitizePrayerDay(value)]),
      ),
      repairState: {
        ...raw.repairState,
      },
    };
  }

  private async saveState(nextState: StoredPrayerRuntimeState) {
    await storage.setItem(STORAGE_KEY, nextState);
  }

  async getPrayerDays() {
    const state = await this.loadState();
    return Object.values(state.prayerDays).sort((left, right) => left.date.localeCompare(right.date));
  }

  async getPrayerDay(dateKey: string) {
    const state = await this.loadState();
    return state.prayerDays[dateKey] ?? null;
  }

  async upsertPrayerDays(days: PrayerDaySchedule[]) {
    const state = await this.loadState();
    for (const day of days) {
      state.prayerDays[day.date] = sanitizePrayerDay(day);
    }
    await this.saveState(state);
  }

  async replacePrayerDays(days: PrayerDaySchedule[]) {
    const state = await this.loadState();
    state.prayerDays = Object.fromEntries(days.map((day) => [day.date, sanitizePrayerDay(day)]));
    await this.saveState(state);
  }

  async prunePrayerDays(predicate: (day: PrayerDaySchedule) => boolean) {
    const state = await this.loadState();
    state.prayerDays = Object.fromEntries(
      Object.entries(state.prayerDays).filter(([, day]) => predicate(day)),
    );
    await this.saveState(state);
  }

  async getRepairState() {
    const state = await this.loadState();
    return state.repairState;
  }

  async setRepairState(patch: Partial<RepairState>) {
    const state = await this.loadState();
    state.repairState = {
      ...state.repairState,
      ...patch,
    };
    await this.saveState(state);
  }

  async clearAll() {
    prayerLogger.warn('Clearing prayer runtime cache');
    await storage.removeItem(STORAGE_KEY);
  }
}

export const prayerTimesRepository = new PrayerTimesRepository();
