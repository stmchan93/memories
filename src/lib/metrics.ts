import type {
  AppData,
  CareerEntry,
  DailyCheckin,
  MoneySnapshot,
  Project,
  Profile,
  WeeklyReview,
} from '../types';
import {
  formatDateInput,
  isValidDate,
  parseDateInput,
  shiftDateInput,
  startOfLocalDay,
  todayDateInput,
} from './dates';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const ROLLING_SEVEN_DAYS = 6;
const DAYS_PER_MONTH = 30.44;

const diffInDays = (later: Date, earlier: Date) =>
  Math.round((startOfLocalDay(later).getTime() - startOfLocalDay(earlier).getTime()) / MS_PER_DAY);

const toValidDate = (value: string) => {
  const date = parseDateInput(value);

  return isValidDate(date) ? date : null;
};

const getCurrentWeekStart = (anchor = new Date()) => {
  const date = startOfLocalDay(anchor);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);

  return date;
};

const getCurrentWeekEnd = (anchor = new Date()) => {
  const start = getCurrentWeekStart(anchor);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return end;
};

const isWithinCurrentWeek = (value: string) => {
  const date = toValidDate(value);
  const start = getCurrentWeekStart();
  const end = getCurrentWeekEnd();

  return date != null && date >= start && date < end;
};

const getRecentCheckins = (checkins: DailyCheckin[]) => {
  const start = startOfLocalDay(new Date());
  start.setDate(start.getDate() - ROLLING_SEVEN_DAYS);

  return checkins.filter((checkin) => {
    const date = toValidDate(checkin.date);

    return date != null && date >= start;
  });
};

const sortDescendingByDate = <T extends { date?: string; weekEndingDate?: string }>(items: T[]) =>
  [...items].sort((a, b) => {
    const left = a.date ?? a.weekEndingDate ?? '';
    const right = b.date ?? b.weekEndingDate ?? '';

    return right.localeCompare(left);
  });

export const formatShortDateLabel = (value: string) => {
  const date = toValidDate(value);

  if (date == null) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const getWeekEndingDate = (value: string) => {
  const date = toValidDate(value);

  if (date == null) {
    return null;
  }

  const day = date.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);

  return formatDateInput(date);
};

export type MoneyHistoryPoint = {
  date: string;
  label: string;
  liquidCash: number | null;
  projectedCash: number | null;
};

export type DailyHistoryPoint = {
  date: string;
  label: string;
  mood: number | null;
  selfTrust: number | null;
  hoursBuilding: number;
  hoursJobSearching: number;
};

export type CareerHistoryPoint = {
  weekEndingDate: string;
  label: string;
  applications: number;
  interviews: number;
};

export type WeeklyGoalProgressItem = {
  key:
    | 'buildHours'
    | 'applications'
    | 'workouts'
    | 'monthlySpendTarget';
  label: string;
  shortLabel: string;
  currentValue: number | null;
  targetValue: number;
  progress: number;
  valueLabel: string;
  remainingLabel: string;
  statusLabel: string;
  statusTone: 'complete' | 'ahead' | 'on-pace' | 'behind' | 'needs-data';
  isComplete: boolean;
};

export type CompletedPlanItem = {
  id: string;
  date: string;
  label: string;
  text: string;
};

export const getLatestMoneySnapshot = (data: AppData): MoneySnapshot | null =>
  [...data.moneySnapshots].sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0] ?? null;

export const getRecentMoneySnapshots = (snapshots: MoneySnapshot[], limit = 8) =>
  [...snapshots]
    .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))
    .slice(0, limit);

export type MoneyBurnEstimate = {
  monthlyBurn: number | null;
  source: 'derived' | 'override' | 'none';
  previousSnapshotDate: string | null;
  daysBetween: number | null;
  cashChange: number | null;
};

export type SnapshotTrend = {
  cashChange: number;
  daysBetween: number;
  impliedMonthlyBurn: number | null;
};

export const getSnapshotTrend = (
  newerSnapshot: MoneySnapshot,
  olderSnapshot: MoneySnapshot,
): SnapshotTrend | null => {
  const newerDate = toValidDate(newerSnapshot.snapshotDate);
  const olderDate = toValidDate(olderSnapshot.snapshotDate);

  if (newerDate == null || olderDate == null) {
    return null;
  }

  const daysBetween = diffInDays(newerDate, olderDate);

  if (daysBetween <= 0) {
    return null;
  }

  const cashChange = olderSnapshot.liquidCash - newerSnapshot.liquidCash;
  const impliedMonthlyBurn = (cashChange / daysBetween) * DAYS_PER_MONTH;

  return {
    cashChange,
    daysBetween,
    impliedMonthlyBurn: impliedMonthlyBurn > 0 ? impliedMonthlyBurn : null,
  };
};

export const getMoneyBurnEstimate = (snapshots: MoneySnapshot[]): MoneyBurnEstimate => {
  const sortedSnapshots = [...snapshots].sort((a, b) =>
    b.snapshotDate.localeCompare(a.snapshotDate),
  );
  const latestSnapshot = sortedSnapshots[0] ?? null;
  const previousSnapshot = sortedSnapshots.find(
    (snapshot, index) =>
      index > 0 && snapshot.snapshotDate !== latestSnapshot?.snapshotDate,
  ) ?? null;

  if (latestSnapshot && previousSnapshot) {
    const trend = getSnapshotTrend(latestSnapshot, previousSnapshot);

    if (trend) {
      return {
        monthlyBurn: trend.impliedMonthlyBurn,
        source: 'derived',
        previousSnapshotDate: previousSnapshot.snapshotDate,
        daysBetween: trend.daysBetween,
        cashChange: trend.cashChange,
      };
    }
  }

  if (latestSnapshot?.burnRateOverride != null && latestSnapshot.burnRateOverride > 0) {
    return {
      monthlyBurn: latestSnapshot.burnRateOverride,
      source: 'override',
      previousSnapshotDate: null,
      daysBetween: null,
      cashChange: null,
    };
  }

  return {
    monthlyBurn: null,
    source: 'none',
    previousSnapshotDate: null,
    daysBetween: null,
    cashChange: null,
  };
};

export const getEstimatedMonthlyBurn = (snapshots: MoneySnapshot[]) =>
  getMoneyBurnEstimate(snapshots).monthlyBurn;

export const getMoneyHistorySeries = (data: AppData): MoneyHistoryPoint[] => {
  const snapshots = [...data.moneySnapshots].sort((a, b) =>
    a.snapshotDate.localeCompare(b.snapshotDate),
  );

  if (snapshots.length === 0) {
    return [];
  }

  const points: MoneyHistoryPoint[] = snapshots.map((snapshot) => ({
    date: snapshot.snapshotDate,
    label: formatShortDateLabel(snapshot.snapshotDate),
    liquidCash: snapshot.liquidCash,
    projectedCash: null,
  }));

  const latestSnapshot = snapshots[snapshots.length - 1] ?? null;
  const profile = data.profile;

  if (!latestSnapshot || !profile) {
    return points;
  }

  const projectionPoints: Array<{ date: string; projectedCash: number }> = [];
  const markerDates = new Set<string>();
  const targetDecisionDate = profile.targetDecisionDate;
  const estimatedMonthlyBurn = getEstimatedMonthlyBurn(data.moneySnapshots);
  const thresholdDate = getPanicThresholdDate(profile, latestSnapshot, estimatedMonthlyBurn);

  if (
    targetDecisionDate != null &&
    targetDecisionDate !== '' &&
    targetDecisionDate > latestSnapshot.snapshotDate
  ) {
    markerDates.add(targetDecisionDate);

    if (estimatedMonthlyBurn != null) {
      const decisionDate = toValidDate(targetDecisionDate);
      const snapshotDate = toValidDate(latestSnapshot.snapshotDate);

      if (decisionDate != null && snapshotDate != null) {
        const daysUntilDecision = diffInDays(decisionDate, snapshotDate);
        const projectedCashAtDecision =
          latestSnapshot.liquidCash - (estimatedMonthlyBurn / DAYS_PER_MONTH) * daysUntilDecision;

        projectionPoints.push({
          date: targetDecisionDate,
          projectedCash: projectedCashAtDecision,
        });
      }
    }
  }

  if (
    thresholdDate &&
    thresholdDate > latestSnapshot.snapshotDate &&
    profile.panicThresholdCash != null
  ) {
    markerDates.add(thresholdDate);
    projectionPoints.push({
      date: thresholdDate,
      projectedCash: profile.panicThresholdCash,
    });
  }

  if (projectionPoints.length > 0) {
    points[points.length - 1] = {
      ...points[points.length - 1],
      projectedCash: latestSnapshot.liquidCash,
    };
  }

  projectionPoints.sort((a, b) => a.date.localeCompare(b.date));

  for (const projectionPoint of projectionPoints) {
    const existingProjectionPoint = points.find((point) => point.date === projectionPoint.date);

    if (existingProjectionPoint) {
      existingProjectionPoint.projectedCash = projectionPoint.projectedCash;
      continue;
    }

    points.push({
      date: projectionPoint.date,
      label: formatShortDateLabel(projectionPoint.date),
      liquidCash: null,
      projectedCash: projectionPoint.projectedCash,
    });
  }

  for (const markerDate of markerDates) {
    const existingPoint = points.find((point) => point.date === markerDate);

    if (existingPoint) {
      continue;
    }

    points.push({
      date: markerDate,
      label: formatShortDateLabel(markerDate),
      liquidCash: null,
      projectedCash: null,
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
};

export const getDaysUnemployed = (profile: Profile) => {
  const unemploymentStart = toValidDate(profile.unemploymentStartDate);

  if (unemploymentStart == null) {
    return 0;
  }

  return Math.max(0, diffInDays(new Date(), unemploymentStart));
};

export const getWeeksSinceLeaving = (profile: Profile) =>
  Math.floor(getDaysUnemployed(profile) / 7);

export const getDaysUntilTargetDecision = (profile: Profile) => {
  if (profile.targetDecisionDate == null || profile.targetDecisionDate === '') {
    return null;
  }

  const targetDecisionDate = toValidDate(profile.targetDecisionDate);

  if (targetDecisionDate == null) {
    return null;
  }

  return diffInDays(targetDecisionDate, new Date());
};

export const getRunwayMonths = (
  snapshot: MoneySnapshot | null,
  estimatedMonthlyBurn: number | null,
) => {
  if (!snapshot || estimatedMonthlyBurn == null || estimatedMonthlyBurn <= 0) {
    return null;
  }

  return snapshot.liquidCash / estimatedMonthlyBurn;
};

export const getPanicThresholdDate = (
  profile: Profile,
  snapshot: MoneySnapshot | null,
  estimatedMonthlyBurn: number | null,
) => {
  if (!snapshot || profile.panicThresholdCash == null) {
    return null;
  }

  const snapshotDate = toValidDate(snapshot.snapshotDate);

  if (snapshotDate == null || estimatedMonthlyBurn == null || estimatedMonthlyBurn <= 0) {
    return null;
  }

  if (snapshot.liquidCash <= profile.panicThresholdCash) {
    return snapshot.snapshotDate;
  }

  const monthsUntilThreshold =
    (snapshot.liquidCash - profile.panicThresholdCash) / estimatedMonthlyBurn;
  const daysUntilThreshold = Math.floor(monthsUntilThreshold * DAYS_PER_MONTH);
  const date = new Date(snapshotDate);
  date.setDate(date.getDate() + daysUntilThreshold);

  return formatDateInput(date);
};

export const formatCurrency = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatDecimal = (value: number | null, digits = 1) => {
  if (value === null) {
    return 'N/A';
  }

  return value.toFixed(digits);
};

export const formatRunwayLabel = (value: number | null) => {
  if (value === null) {
    return 'Not enough data';
  }

  return `${formatDecimal(value)} months`;
};

export const formatBurnRateLabel = (value: number | null) =>
  value == null ? 'Need 1 more checkpoint' : `${formatCurrency(value)} / month`;

export const formatCurrencyCompact = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
};

export const formatIsoDate = (value: string | null) => {
  if (!value) {
    return 'Not set';
  }

  const date = toValidDate(value);

  if (date == null) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const getCareerSummary = (entries: CareerEntry[]) => {
  const summary = {
    applications: 0,
    interviews: 0,
  };

  for (const entry of entries) {
    if (!isWithinCurrentWeek(entry.date)) {
      continue;
    }

    const quantity = entry.quantity ?? 1;

    switch (entry.type) {
      case 'application':
        summary.applications += quantity;
        break;
      case 'interview':
        summary.interviews += quantity;
        break;
      default:
        break;
    }
  }

  return summary;
};

export const getRecentCareerEntries = (entries: CareerEntry[], limit = 8) =>
  [...entries]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

export const getCareerHistorySeries = (entries: CareerEntry[], weeks = 8): CareerHistoryPoint[] => {
  const today = todayDateInput();
  const currentWeekEndingDate = getWeekEndingDate(today) ?? today;
  const buckets = Array.from({ length: weeks }, (_, index) => {
    const weekEndingDate = shiftDateInput(currentWeekEndingDate, (index - (weeks - 1)) * 7);

    return {
      weekEndingDate,
      label: formatShortDateLabel(weekEndingDate),
      applications: 0,
      interviews: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.weekEndingDate, bucket]));

  for (const entry of entries) {
    const weekEndingDate = getWeekEndingDate(entry.date);

    if (!weekEndingDate) {
      continue;
    }

    const bucket = bucketMap.get(weekEndingDate);

    if (!bucket) {
      continue;
    }

    const quantity = entry.quantity ?? 1;

    switch (entry.type) {
      case 'application':
        bucket.applications += quantity;
        break;
      case 'interview':
        bucket.interviews += quantity;
        break;
      default:
        break;
    }
  }

  return buckets;
};

const getConsecutiveStreak = (
  checkins: DailyCheckin[],
  predicate: (checkin: DailyCheckin) => boolean,
) => {
  const checkinMap = new Map(checkins.map((checkin) => [checkin.date, checkin]));
  const cursor = startOfLocalDay(new Date());
  let streak = 0;

  while (true) {
    const date = formatDateInput(cursor);
    const checkin = checkinMap.get(date);

    if (!checkin || !predicate(checkin)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export const getExperimentSummary = (checkins: DailyCheckin[]) => {
  const thisWeekCheckins = checkins.filter((checkin) => isWithinCurrentWeek(checkin.date));

  return {
    meaningfulThingStreak: getConsecutiveStreak(
      checkins,
      (checkin) => checkin.didMeaningfulThing,
    ),
    buildStreak: getConsecutiveStreak(checkins, (checkin) => checkin.hoursBuilding > 0),
    workoutStreak: getConsecutiveStreak(checkins, (checkin) => checkin.didExercise),
    workoutsThisWeek: thisWeekCheckins.filter((checkin) => checkin.didExercise).length,
    checkinsThisWeek: thisWeekCheckins.length,
    meaningfulThingsThisWeek: thisWeekCheckins.filter(
      (checkin) => checkin.didMeaningfulThing,
    ).length,
    hoursBuiltThisWeek: thisWeekCheckins.reduce(
      (total, checkin) => total + checkin.hoursBuilding,
      0,
    ),
    hoursJobSearchingThisWeek: thisWeekCheckins.reduce(
      (total, checkin) => total + checkin.hoursJobSearching,
      0,
    ),
    applicationsThisWeek: thisWeekCheckins.reduce(
      (total, checkin) => total + (checkin.applicationsSent ?? 0),
      0,
    ),
  };
};

const getAverage = (values: number[]) => {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const getSignalSummary = (checkins: DailyCheckin[]) => {
  const recentCheckins = getRecentCheckins(checkins);
  const latestCheckin = sortDescendingByDate(recentCheckins)[0] ?? null;

  return {
    mood7dAvg: getAverage(recentCheckins.map((checkin) => checkin.mood)),
    latestSelfTrust: latestCheckin?.selfTrust ?? null,
    checkinsLast7Days: recentCheckins.length,
  };
};

export const getTodayCheckin = (checkins: DailyCheckin[]) => {
  const today = formatDateInput(startOfLocalDay(new Date()));

  return checkins.find((checkin) => checkin.date === today) ?? null;
};

export const getYesterdayCheckin = (checkins: DailyCheckin[]) => {
  const yesterday = shiftDateInput(formatDateInput(startOfLocalDay(new Date())), -1);

  return checkins.find((checkin) => checkin.date === yesterday) ?? null;
};

export const getDailyCheckinByDate = (checkins: DailyCheckin[], date: string) =>
  checkins.find((checkin) => checkin.date === date) ?? null;

export const getRecentDailyCheckins = (checkins: DailyCheckin[], limit = 7) =>
  [...checkins]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);

export const getRecentDayEntries = (checkins: DailyCheckin[], limit = 7) =>
  getRecentDailyCheckins(checkins, limit);

export const getHighlightedDayEntries = (checkins: DailyCheckin[], limit = 6) =>
  getRecentDailyCheckins(
    checkins.filter((checkin) => checkin.isHighlight || Boolean(checkin.highlightNote.trim())),
    limit,
  );

export const getCompletedPlanItems = (
  checkins: DailyCheckin[],
  limit = 12,
): CompletedPlanItem[] =>
  getRecentDailyCheckins(checkins, checkins.length)
    .flatMap((checkin) =>
      checkin.planItems
        .filter((item) => item.completed && item.text.trim())
        .map((item) => ({
          id: item.id,
          date: checkin.date,
          label: formatShortDateLabel(checkin.date),
          text: item.text.trim(),
        })),
    )
    .slice(0, limit);

export const getDailyHistorySeries = (checkins: DailyCheckin[], days = 14): DailyHistoryPoint[] => {
  const checkinMap = new Map(checkins.map((checkin) => [checkin.date, checkin]));
  const today = todayDateInput();

  return Array.from({ length: days }, (_, index) => {
    const date = shiftDateInput(today, index - (days - 1));
    const checkin = checkinMap.get(date);

    return {
      date,
      label: formatShortDateLabel(date),
      mood: checkin?.mood ?? null,
      selfTrust: checkin?.selfTrust ?? null,
      hoursBuilding: checkin?.hoursBuilding ?? 0,
      hoursJobSearching: checkin?.hoursJobSearching ?? 0,
    };
  });
};

export const getRecentWeeklyReviews = (reviews: WeeklyReview[], limit = 6) =>
  [...reviews]
    .sort((a, b) => b.weekEndingDate.localeCompare(a.weekEndingDate))
    .slice(0, limit);

export const getLatestWeeklyReview = (reviews: WeeklyReview[]) =>
  [...reviews].sort((a, b) => b.weekEndingDate.localeCompare(a.weekEndingDate))[0] ?? null;

export const getCurrentWeeklyReview = (reviews: WeeklyReview[]) => {
  const currentWeekEndingDate = getWeekEndingDate(todayDateInput());

  if (currentWeekEndingDate == null) {
    return null;
  }

  return reviews.find((review) => review.weekEndingDate === currentWeekEndingDate) ?? null;
};

const getCurrentWeekProgress = (anchor = new Date()) => {
  const start = getCurrentWeekStart(anchor);
  const end = getCurrentWeekEnd(anchor);
  const total = end.getTime() - start.getTime();
  const elapsed = Math.min(
    Math.max(startOfLocalDay(anchor).getTime() - start.getTime() + MS_PER_DAY, 0),
    total,
  );

  if (total <= 0) {
    return 0;
  }

  return elapsed / total;
};

export const hasWeeklyGoals = (review: WeeklyReview | null) =>
  review != null &&
  (review.weeklyGoals.buildHours != null ||
    review.weeklyGoals.applications != null ||
    review.weeklyGoals.workouts != null ||
    review.weeklyGoals.monthlySpendTarget != null);

const formatGoalNumber = (value: number) =>
  Number.isInteger(value) ? `${value}` : formatDecimal(value, 1);

const buildStandardGoalProgress = ({
  key,
  label,
  shortLabel,
  currentValue,
  targetValue,
  unit,
  remainingLabel,
}: {
  key: WeeklyGoalProgressItem['key'];
  label: string;
  shortLabel: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  remainingLabel: string;
}): WeeklyGoalProgressItem => {
  const weekProgress = getCurrentWeekProgress();
  const cappedProgress =
    targetValue <= 0 ? 1 : Math.min(currentValue / targetValue, 1);
  const remaining = Math.max(targetValue - currentValue, 0);
  const isComplete = currentValue >= targetValue;
  const paceTarget = targetValue * weekProgress;
  const paceRatio = paceTarget <= 0 ? 0 : currentValue / paceTarget;
  const currentLabel = `${formatGoalNumber(currentValue)} / ${formatGoalNumber(targetValue)} ${unit}`;
  const statusTone: WeeklyGoalProgressItem['statusTone'] = isComplete
    ? 'complete'
    : currentValue === 0 && weekProgress <= 0.2
      ? 'on-pace'
      : paceRatio >= 1.2
        ? 'ahead'
        : paceRatio >= 0.9
          ? 'on-pace'
          : 'behind';
  const statusLabel =
    statusTone === 'complete'
      ? 'Goal reached'
      : statusTone === 'ahead'
        ? 'Ahead of pace'
        : statusTone === 'on-pace'
          ? 'On pace'
          : 'Behind pace';

  return {
    key,
    label,
    shortLabel,
    currentValue,
    targetValue,
    progress: cappedProgress,
    valueLabel: currentLabel,
    remainingLabel: `${formatGoalNumber(remaining)} ${remainingLabel} left`,
    statusLabel,
    statusTone,
    isComplete,
  };
};

export const getWeeklyGoalsProgress = (
  data: AppData,
  review: WeeklyReview | null = getCurrentWeeklyReview(data.weeklyReviews),
): WeeklyGoalProgressItem[] => {
  if (!review) {
    return [];
  }

  const experimentSummary = getExperimentSummary(data.dailyCheckins);
  const estimatedMonthlyBurn = getEstimatedMonthlyBurn(data.moneySnapshots);
  const rows: WeeklyGoalProgressItem[] = [];

  if (review.weeklyGoals.buildHours != null) {
    rows.push(
      buildStandardGoalProgress({
        key: 'buildHours',
        label: 'Build hours',
        shortLabel: 'Build',
        currentValue: experimentSummary.hoursBuiltThisWeek,
        targetValue: review.weeklyGoals.buildHours,
        unit: 'hours',
        remainingLabel: 'hours',
      }),
    );
  }

  if (review.weeklyGoals.applications != null) {
    rows.push(
      buildStandardGoalProgress({
        key: 'applications',
        label: 'Applications',
        shortLabel: 'Apply',
        currentValue: experimentSummary.applicationsThisWeek,
        targetValue: review.weeklyGoals.applications,
        unit: 'sent',
        remainingLabel: 'applications',
      }),
    );
  }

  if (review.weeklyGoals.workouts != null) {
    rows.push(
      buildStandardGoalProgress({
        key: 'workouts',
        label: 'Workouts',
        shortLabel: 'Move',
        currentValue: experimentSummary.workoutsThisWeek,
        targetValue: review.weeklyGoals.workouts,
        unit: 'done',
        remainingLabel: 'workouts',
      }),
    );
  }

  if (review.weeklyGoals.monthlySpendTarget != null) {
    const targetValue = review.weeklyGoals.monthlySpendTarget;
    const progress =
      estimatedMonthlyBurn == null
        ? 0
        : targetValue <= 0
          ? estimatedMonthlyBurn <= 0
            ? 1
            : 0
          : Math.min(estimatedMonthlyBurn / targetValue, 1);
    const delta =
      estimatedMonthlyBurn == null ? null : targetValue - estimatedMonthlyBurn;

    rows.push({
      key: 'monthlySpendTarget',
      label: 'Monthly spend',
      shortLabel: 'Spend',
      currentValue: estimatedMonthlyBurn,
      targetValue,
      progress,
      valueLabel:
        estimatedMonthlyBurn == null
          ? `Need 1 more checkpoint · target ${formatCurrency(targetValue)}`
          : `${formatCurrency(estimatedMonthlyBurn)} / ${formatCurrency(targetValue)}`,
      remainingLabel:
        estimatedMonthlyBurn == null
          ? 'Add one more cash checkpoint'
          : delta != null && delta >= 0
            ? `${formatCurrency(delta)} under target`
            : `${formatCurrency(Math.abs(delta ?? 0))} over target`,
      statusLabel:
        estimatedMonthlyBurn == null
          ? 'Need data'
          : delta != null && delta >= 0
            ? 'On pace'
            : 'Over target',
      statusTone:
        estimatedMonthlyBurn == null
          ? 'needs-data'
          : delta != null && delta >= 0
            ? 'on-pace'
            : 'behind',
      isComplete: estimatedMonthlyBurn != null && estimatedMonthlyBurn <= targetValue,
    });
  }

  return rows;
};

export const getProjectSummary = (projects: Project[]) => ({
  total: projects.length,
  active: projects.filter((project) => project.status === 'active').length,
  shipped: projects.filter((project) => project.status === 'shipped').length,
  paused: projects.filter((project) => project.status === 'paused').length,
});

export const getRecentProjects = (projects: Project[], limit = 6) =>
  [...projects]
    .sort((a, b) => (b.shippedAt ?? b.updatedAt).localeCompare(a.shippedAt ?? a.updatedAt))
    .slice(0, limit);

export const getChapterSummary = (data: AppData) => {
  const photoCount = data.dailyCheckins.reduce(
    (total, checkin) => total + checkin.photoDataUrls.length,
    0,
  );

  return {
    totalEntries: data.dailyCheckins.length,
    photoCount,
    projectsWorkedOn: data.projects.length,
  };
};
