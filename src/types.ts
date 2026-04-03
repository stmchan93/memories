export type IsoDate = string;

export type ShareVisibility = 'private' | 'public';

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

export type DayCounted = 'yes' | 'mostly' | 'no';

export type FocusStatus = 'done' | 'partial' | 'rolled-over';

export type DayPlanItem = {
  id: string;
  text: string;
  completed: boolean;
  source: 'manual' | 'calendar';
};

export type DailyCheckin = {
  id: string;
  date: IsoDate;
  mood: number;
  selfTrust: number;
  hoursBuilding: number;
  hoursJobSearching: number;
  applicationsSent: number;
  didExercise: boolean;
  didMeaningfulThing: boolean;
  dailyFocus: string;
  planItems: DayPlanItem[];
  tomorrowFocus: string;
  isHighlight: boolean;
  highlightNote: string;
  didDayCount: DayCounted | null;
  focusStatus: FocusStatus | null;
  summary: string;
  highlights: string[];
  tags: string[];
  photoDataUrls: string[];
  shareVisibility: ShareVisibility;
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

export type WeeklyGoals = {
  buildHours: number | null;
  applications: number | null;
  workouts: number | null;
  monthlySpendTarget: number | null;
};

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
  weeklyGoals: WeeklyGoals;
  runwayUpdateNote: string;
  createdAt: string;
};

export type ProjectType =
  | 'project'
  | 'post'
  | 'video'
  | 'channel'
  | 'profile'
  | 'link';

export type ProjectStatus = 'active' | 'shipped' | 'paused';

export type Project = {
  id: string;
  itemType: ProjectType;
  name: string;
  status: ProjectStatus;
  summary: string;
  url: string;
  notes: string;
  startedAt: IsoDate;
  shippedAt: IsoDate | null;
  shareVisibility: ShareVisibility;
  createdAt: string;
  updatedAt: string;
};

export type SyncedCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  startAt: string;
  endAt: string;
  startDate: IsoDate;
  endDateExclusive: IsoDate | null;
  isAllDay: boolean;
  htmlLink: string | null;
};

export type GoogleCalendarSync = {
  isConnected: boolean;
  lastSyncedAt: string | null;
  syncedMonth: IsoDate | null;
  events: SyncedCalendarEvent[];
};

export type ShareSettings = {
  slug: string;
  ownerKey: string;
  completedOnboardingAt: string | null;
};

export type PublishedMemory = {
  date: IsoDate;
  summary: string;
  photoDataUrls: string[];
};

export type PublishedProject = {
  itemType: ProjectType;
  name: string;
  status: ProjectStatus;
  summary: string;
  url: string;
  startedAt: IsoDate;
  shippedAt: IsoDate | null;
};

export type PublicChapterSnapshot = {
  slug: string;
  title: string;
  subtitle: string;
  daysLogged: number;
  photos: number;
  projectsWorkedOn: number;
  projects: PublishedProject[];
  highlights: PublishedMemory[];
  publishedAt: string;
};

export type AppData = {
  profile: Profile | null;
  moneySnapshots: MoneySnapshot[];
  dailyCheckins: DailyCheckin[];
  careerEntries: CareerEntry[];
  weeklyReviews: WeeklyReview[];
  projects: Project[];
  googleCalendar: GoogleCalendarSync;
  shareSettings: ShareSettings;
};

export type AppRoute = 'calendar' | 'projects' | 'wrapped' | 'settings';

export type SetupInput = {
  unemploymentStartDate: IsoDate;
  targetDecisionDate: IsoDate;
  panicThresholdCash: string;
  snapshotDate: IsoDate;
  liquidCash: string;
  note: string;
};
