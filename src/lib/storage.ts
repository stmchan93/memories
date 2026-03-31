import type { AppData, MoneySnapshot, Profile, SetupInput } from '../types';
import { todayDateInput } from './dates';

const STORAGE_KEY = 'runway.app-data.v1';

export const createEmptyAppData = (): AppData => ({
  profile: null,
  moneySnapshots: [],
  dailyCheckins: [],
  careerEntries: [],
  weeklyReviews: [],
});

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const loadAppData = (): AppData => {
  if (typeof window === 'undefined') {
    return createEmptyAppData();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return createEmptyAppData();
  }

  try {
    const parsed = JSON.parse(raw) as AppData;

    return {
      ...createEmptyAppData(),
      ...parsed,
      moneySnapshots:
        parsed.moneySnapshots?.map((snapshot) => {
          const legacySnapshot = snapshot as MoneySnapshot & {
            monthlyBurn?: number | null;
          };

          return {
            id: snapshot.id,
            snapshotDate: snapshot.snapshotDate,
            liquidCash: snapshot.liquidCash,
            note: snapshot.note ?? '',
            burnRateOverride:
              legacySnapshot.burnRateOverride ?? legacySnapshot.monthlyBurn ?? null,
            createdAt: snapshot.createdAt,
          };
        }) ?? [],
      dailyCheckins: parsed.dailyCheckins ?? [],
      careerEntries:
        parsed.careerEntries?.map((entry) => ({
          ...entry,
          quantity: entry.quantity ?? 1,
        })) ?? [],
      weeklyReviews:
        parsed.weeklyReviews?.map((review) => ({
          ...review,
          weekSummary: review.weekSummary ?? '',
        })) ?? [],
    };
  } catch {
    return createEmptyAppData();
  }
};

export const saveAppData = (data: AppData) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

const toNumber = (value: string) => Number.parseFloat(value);

export const buildInitialData = (input: SetupInput): AppData => {
  const now = new Date().toISOString();
  const profile: Profile = {
    id: createId(),
    unemploymentStartDate: input.unemploymentStartDate,
    targetDecisionDate: input.targetDecisionDate.trim() || null,
    panicThresholdCash: input.panicThresholdCash.trim()
      ? toNumber(input.panicThresholdCash)
      : null,
    createdAt: now,
    updatedAt: now,
  };

  const moneySnapshot: MoneySnapshot = {
    id: createId(),
    snapshotDate: input.snapshotDate.trim() || todayDateInput(),
    liquidCash: toNumber(input.liquidCash),
    note: input.note.trim(),
    burnRateOverride: null,
    createdAt: now,
  };

  return {
    profile,
    moneySnapshots: [moneySnapshot],
    dailyCheckins: [],
    careerEntries: [],
    weeklyReviews: [],
  };
};
