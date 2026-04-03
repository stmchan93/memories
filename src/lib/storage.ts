import type {
  AppData,
  DayPlanItem,
  GoogleCalendarSync,
  MoneySnapshot,
  Profile,
  ShareSettings,
  SetupInput,
  WeeklyGoals,
} from '../types';
import { todayDateInput } from './dates';
import { normalizeStoredChapterPhoto } from './supabasePhotos';

const STORAGE_KEY = 'runway.app-data.v1';
const PHOTO_DB_NAME = 'runway-photo-store';
const PHOTO_STORE_NAME = 'daily-checkin-photos';

type DailyPhotoRecord = {
  date: string;
  photoDataUrls: string[];
};

const isLocalPhotoDataUrl = (value: string) => value.startsWith('data:');
const emptyWeeklyGoals = (): WeeklyGoals => ({
  buildHours: 16,
  applications: 5,
  workouts: 3,
  monthlySpendTarget: 2000,
});

const emptyGoogleCalendarSync = (): GoogleCalendarSync => ({
  isConnected: false,
  lastSyncedAt: null,
  syncedMonth: null,
  events: [],
});

const emptyShareSettings = (): ShareSettings => ({
  slug: '',
  ownerKey: createId(),
  completedOnboardingAt: null,
});

export const createDefaultWeeklyGoals = (): WeeklyGoals => emptyWeeklyGoals();
export const createDefaultShareSettings = (): ShareSettings => emptyShareSettings();

export const createEmptyAppData = (): AppData => ({
  profile: null,
  moneySnapshots: [],
  dailyCheckins: [],
  careerEntries: [],
  weeklyReviews: [],
  projects: [],
  googleCalendar: emptyGoogleCalendarSync(),
  shareSettings: emptyShareSettings(),
});

export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const parsePlanItemsFromLegacyFocus = (value: string): DayPlanItem[] =>
  value
    .split('\n')
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
    .map((text) => ({
      id: createId(),
      text,
      completed: false,
      source: 'manual' as const,
    }));

export const coerceAppData = (parsed?: Partial<AppData> | null): AppData => {
  const safe = parsed ?? {};

  return {
    ...createEmptyAppData(),
    ...safe,
    moneySnapshots:
      safe.moneySnapshots?.map((snapshot) => {
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
    dailyCheckins:
      safe.dailyCheckins?.map((checkin) => {
        const legacyCheckin = checkin as typeof checkin & {
          photoDataUrl?: string | null;
          photoDataUrls?: string[];
        };

        return {
          ...checkin,
          applicationsSent: checkin.applicationsSent ?? 0,
          dailyFocus: checkin.dailyFocus ?? '',
          planItems:
            checkin.planItems?.map((item) => ({
              id: item.id ?? createId(),
              text: item.text ?? '',
              completed: item.completed ?? false,
              source: item.source ?? 'manual',
            })) ?? parsePlanItemsFromLegacyFocus(checkin.dailyFocus ?? ''),
          tomorrowFocus: checkin.tomorrowFocus ?? '',
          isHighlight: checkin.isHighlight ?? false,
          highlightNote: checkin.highlightNote ?? '',
          didDayCount: checkin.didDayCount ?? null,
          focusStatus: checkin.focusStatus ?? null,
          summary: checkin.summary ?? checkin.note ?? '',
          highlights: checkin.highlights ?? [],
          tags: checkin.tags ?? [],
          photoDataUrls:
            (legacyCheckin.photoDataUrls ??
              (legacyCheckin.photoDataUrl ? [legacyCheckin.photoDataUrl] : []))
              .map((photoDataUrl) => normalizeStoredChapterPhoto(photoDataUrl))
              .slice(0, 1),
          shareVisibility: checkin.shareVisibility ?? 'public',
          note: checkin.note ?? checkin.summary ?? '',
        };
      }) ?? [],
    careerEntries:
      safe.careerEntries?.map((entry) => ({
        ...entry,
        quantity: entry.quantity ?? 1,
      })) ?? [],
    weeklyReviews:
      safe.weeklyReviews?.map((review) => ({
        ...review,
        weekSummary: review.weekSummary ?? '',
        weeklyGoals: {
          buildHours: review.weeklyGoals?.buildHours ?? emptyWeeklyGoals().buildHours,
          applications: review.weeklyGoals?.applications ?? emptyWeeklyGoals().applications,
          workouts: review.weeklyGoals?.workouts ?? emptyWeeklyGoals().workouts,
          monthlySpendTarget:
            review.weeklyGoals?.monthlySpendTarget ?? emptyWeeklyGoals().monthlySpendTarget,
        },
      })) ?? [],
    projects:
      safe.projects?.map((project) => ({
        ...project,
        itemType: project.itemType ?? 'project',
        summary: project.summary ?? '',
        notes: project.notes ?? '',
        status: project.status ?? 'active',
        shippedAt: project.shippedAt ?? null,
        shareVisibility: project.shareVisibility ?? 'public',
        updatedAt: project.updatedAt ?? project.createdAt,
      })) ?? [],
    googleCalendar: {
      isConnected: safe.googleCalendar?.isConnected ?? false,
      lastSyncedAt: safe.googleCalendar?.lastSyncedAt ?? null,
      syncedMonth: safe.googleCalendar?.syncedMonth ?? null,
      events:
        safe.googleCalendar?.events?.map((event) => ({
          id: event.id,
          calendarId: event.calendarId ?? 'primary',
          title: event.title ?? 'Untitled event',
          startAt: event.startAt,
          endAt: event.endAt,
          startDate: event.startDate,
          endDateExclusive: event.endDateExclusive ?? null,
          isAllDay: event.isAllDay ?? false,
          htmlLink: event.htmlLink ?? null,
        })) ?? emptyGoogleCalendarSync().events,
    },
    shareSettings: {
      slug: safe.shareSettings?.slug?.trim() ?? '',
      ownerKey: safe.shareSettings?.ownerKey?.trim() || createId(),
      completedOnboardingAt: safe.shareSettings?.completedOnboardingAt ?? null,
    },
  };
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
    return coerceAppData(JSON.parse(raw) as AppData);
  } catch {
    return createEmptyAppData();
  }
};

const stripPhotosFromData = (data: AppData): AppData => ({
  ...data,
  dailyCheckins: data.dailyCheckins.map((checkin) => ({
    ...checkin,
    photoDataUrls: checkin.photoDataUrls.filter((photoDataUrl) => !isLocalPhotoDataUrl(photoDataUrl)),
  })),
});

const mergeStoredPhotos = (
  data: AppData,
  photoMap: Map<string, string[]>,
): AppData => ({
  ...data,
  dailyCheckins: data.dailyCheckins.map((checkin) => ({
    ...checkin,
    photoDataUrls: [
      ...(checkin.photoDataUrls ?? []).filter((photoDataUrl) => !isLocalPhotoDataUrl(photoDataUrl)),
      ...(photoMap.get(checkin.date) ?? []),
    ],
  })),
});

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const waitForTransaction = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

let photoDatabasePromise: Promise<IDBDatabase> | null = null;

const openPhotoDatabase = () => {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.resolve<IDBDatabase | null>(null);
  }

  if (!photoDatabasePromise) {
    photoDatabasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(PHOTO_DB_NAME, 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains(PHOTO_STORE_NAME)) {
          database.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'date' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return photoDatabasePromise.then((database) => database);
};

const loadStoredPhotos = async () => {
  const database = await openPhotoDatabase();

  if (!database) {
    return new Map<string, string[]>();
  }

  const transaction = database.transaction(PHOTO_STORE_NAME, 'readonly');
  const store = transaction.objectStore(PHOTO_STORE_NAME);
  const records = await requestToPromise(store.getAll() as IDBRequest<DailyPhotoRecord[]>);
  await waitForTransaction(transaction);

  return new Map(records.map((record) => [record.date, record.photoDataUrls]));
};

const saveStoredPhotos = async (data: AppData) => {
  const database = await openPhotoDatabase();

  if (!database) {
    return;
  }

  const existingKeysTransaction = database.transaction(PHOTO_STORE_NAME, 'readonly');
  const existingKeysStore = existingKeysTransaction.objectStore(PHOTO_STORE_NAME);
  const existingKeys = (await requestToPromise(
    existingKeysStore.getAllKeys(),
  )) as Array<string | number | Date>;
  await waitForTransaction(existingKeysTransaction);

  const nextPhotoRecords = data.dailyCheckins
    .map(
      (checkin): DailyPhotoRecord => ({
        date: checkin.date,
        photoDataUrls: checkin.photoDataUrls.filter((photoDataUrl) => isLocalPhotoDataUrl(photoDataUrl)),
      }),
    )
    .filter((checkin) => checkin.photoDataUrls.length > 0)
    .map(
      (checkin): DailyPhotoRecord => ({
        date: checkin.date,
        photoDataUrls: checkin.photoDataUrls,
      }),
    );

  const nextDates = new Set(nextPhotoRecords.map((record) => record.date));
  const writeTransaction = database.transaction(PHOTO_STORE_NAME, 'readwrite');
  const writeStore = writeTransaction.objectStore(PHOTO_STORE_NAME);

  for (const key of existingKeys) {
    const dateKey = String(key);

    if (!nextDates.has(dateKey)) {
      writeStore.delete(dateKey);
    }
  }

  for (const record of nextPhotoRecords) {
    writeStore.put(record);
  }

  await waitForTransaction(writeTransaction);
};

export const hydrateAppData = async (baseData?: AppData) => {
  const data = baseData ?? loadAppData();

  try {
    const photoMap = await loadStoredPhotos();
    return mergeStoredPhotos(data, photoMap);
  } catch (error) {
    console.error('Failed to hydrate stored photos.', error);
    return data;
  }
};

export const saveAppData = async (data: AppData) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await saveStoredPhotos(data);
  } catch (error) {
    console.error('Failed to persist photos in IndexedDB.', error);
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stripPhotosFromData(data)));
  } catch (error) {
    console.error('Failed to persist app data in localStorage.', error);
  }
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
    projects: [],
    googleCalendar: emptyGoogleCalendarSync(),
    shareSettings: emptyShareSettings(),
  };
};
