export type IsoDate = string;

export type Profile = {
  id: string;
  unemploymentStartDate: IsoDate;
  targetDecisionDate: IsoDate | null;
  panicThresholdCash: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MoneySnapshot = {
  id: string;
  snapshotDate: IsoDate;
  liquidCash: number;
  note: string;
  burnRateOverride: number | null;
  createdAt: string;
};

export type DailyCheckin = {
  id: string;
  date: IsoDate;
  mood: number;
  selfTrust: number;
  hoursBuilding: number;
  hoursJobSearching: number;
  didExercise: boolean;
  didMeaningfulThing: boolean;
  note: string;
  gaveEnergyNote?: string;
  drainedEnergyNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type CareerEntryType =
  | 'application'
  | 'interview'
  | 'networking-conversation'
  | 'role-explored'
  | 'company-of-interest';

export type CareerEntry = {
  id: string;
  date: IsoDate;
  type: CareerEntryType;
  quantity: number;
  company: string;
  roleTitle: string;
  energyAfterCall: number | null;
  alignedNote: string;
  misalignedNote: string;
  note: string;
  createdAt: string;
};

export type WeeklyBalance = 'more-job-search' | 'more-experimentation' | 'balanced';

export type WeeklyReview = {
  id: string;
  weekEndingDate: IsoDate;
  weekSummary: string;
  gaveEnergy: string;
  drainedEnergy: string;
  avoided: string;
  didBuildingFeelGood: boolean | null;
  nextWeekBalance: WeeklyBalance;
  weeklyFocus: string;
  runwayUpdateNote: string;
  createdAt: string;
};

export type AppData = {
  profile: Profile | null;
  moneySnapshots: MoneySnapshot[];
  dailyCheckins: DailyCheckin[];
  careerEntries: CareerEntry[];
  weeklyReviews: WeeklyReview[];
};

export type AppRoute = 'home' | 'daily' | 'career' | 'weekly' | 'money';

export type SetupInput = {
  unemploymentStartDate: IsoDate;
  targetDecisionDate: IsoDate;
  panicThresholdCash: string;
  snapshotDate: IsoDate;
  liquidCash: string;
  note: string;
};
