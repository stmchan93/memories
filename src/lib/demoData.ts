import type { AppData, CareerEntry, DailyCheckin, MoneySnapshot, WeeklyReview } from '../types';
import { createId } from './storage';
import { shiftDateInput, todayDateInput } from './dates';

const now = () => new Date().toISOString();

export const createDemoAppData = (): AppData => {
  const today = todayDateInput();
  const unemploymentStartDate = shiftDateInput(today, -78);
  const targetDecisionDate = shiftDateInput(today, 28);

  const moneySnapshots: MoneySnapshot[] = [
    {
      id: createId(),
      snapshotDate: shiftDateInput(today, -45),
      liquidCash: 38200,
      note: 'Early baseline. Burn still included a few transition costs.',
      burnRateOverride: null,
      createdAt: now(),
    },
    {
      id: createId(),
      snapshotDate: shiftDateInput(today, -18),
      liquidCash: 34100,
      note: 'Trimmed a few recurring costs and stopped a couple of subscriptions.',
      burnRateOverride: null,
      createdAt: now(),
    },
    {
      id: createId(),
      snapshotDate: today,
      liquidCash: 31850,
      note: 'Current working estimate after the last card payment cleared.',
      burnRateOverride: null,
      createdAt: now(),
    },
  ];

  const dailyCheckins: DailyCheckin[] = [
    buildDaily(shiftDateInput(today, -9), 6, 5, 1.5, 0.5, true, true, 'Solid start. A little scattered by the afternoon.'),
    buildDaily(shiftDateInput(today, -8), 5, 4, 0, 1.5, false, true, 'Too much browsing, but did one useful follow-up.'),
    buildDaily(shiftDateInput(today, -7), 7, 6, 2.5, 0.5, true, true, 'Good build day. Felt more like myself.'),
    buildDaily(shiftDateInput(today, -6), 6, 6, 1, 2, false, true, 'Networking was better than expected.'),
    buildDaily(shiftDateInput(today, -5), 4, 4, 0.5, 0, true, false, 'Low-friction day, but not very intentional.'),
    buildDaily(shiftDateInput(today, -4), 7, 7, 3, 0.5, true, true, 'Best building session in a while.'),
    buildDaily(shiftDateInput(today, -3), 6, 6, 1, 1.5, false, true, 'Did the uncomfortable outreach and felt better after.'),
    buildDaily(shiftDateInput(today, -2), 5, 5, 0, 2.5, true, true, 'Heavy on job search. Useful, but draining.'),
    buildDaily(shiftDateInput(today, -1), 7, 7, 2, 0.5, true, true, 'Shipping something small helped a lot.'),
    buildDaily(today, 6, 6, 1.5, 1, false, true, 'Reasonable day. Not amazing, but not drifting either.'),
  ];

  const careerEntries: CareerEntry[] = [
    buildCareer(shiftDateInput(today, -6), 'application', 'Retool', 'Frontend engineer', 4, null, 'Good product surface area.', '', 'Submitted with a custom note plus a few similar applications that day.'),
    buildCareer(shiftDateInput(today, -3), 'interview', 'Vanta', 'Product engineer', 1, 6, 'Liked the people.', 'Role sounded a bit more process-heavy than expected.', ''),
    buildCareer(shiftDateInput(today, -1), 'application', '', '', 6, null, '', '', 'Bulk application block after tightening the shortlist.'),
    buildCareer(today, 'interview', 'Notion', 'Product engineer', 1, 7, 'Interesting product questions.', '', 'Warm reconnect turned into a real screen.'),
  ];

  const weeklyReviews: WeeklyReview[] = [
    {
      id: createId(),
      weekEndingDate: shiftDateInput(today, -7),
      weekSummary: 'The week felt steadier once I protected mornings for building and stopped trying to do everything.',
      gaveEnergy: 'Building in the morning and talking to thoughtful people.',
      drainedEnergy: 'Loose internet time and vague career browsing.',
      avoided: 'Shipping the rough version.',
      didBuildingFeelGood: true,
      nextWeekBalance: 'balanced',
      weeklyFocus: 'Ship one small thing and keep job search intentional, not constant.',
      runwayUpdateNote: 'Runway still looked okay. No major changes.',
      createdAt: now(),
    },
    {
      id: createId(),
      weekEndingDate: shiftDateInput(today, 0),
      weekSummary: 'Less volume, better signal. Building felt grounding, and the career actions were more deliberate.',
      gaveEnergy: 'Small shipping wins and one strong networking call.',
      drainedEnergy: 'Low-signal application volume.',
      avoided: 'Following up on two leads faster.',
      didBuildingFeelGood: true,
      nextWeekBalance: 'more-experimentation',
      weeklyFocus: 'Bias toward building in the morning and doing fewer, higher-quality career actions.',
      runwayUpdateNote: 'Burn came down a bit. No need to panic, but keep watching it.',
      createdAt: now(),
    },
  ];

  return {
    profile: {
      id: createId(),
      unemploymentStartDate,
      targetDecisionDate,
      panicThresholdCash: 10000,
      createdAt: now(),
      updatedAt: now(),
    },
    moneySnapshots,
    dailyCheckins,
    careerEntries,
    weeklyReviews,
  };
};

const buildDaily = (
  date: string,
  mood: number,
  selfTrust: number,
  hoursBuilding: number,
  hoursJobSearching: number,
  didExercise: boolean,
  didMeaningfulThing: boolean,
  note: string,
): DailyCheckin => ({
  id: createId(),
  date,
  mood,
  selfTrust,
  hoursBuilding,
  hoursJobSearching,
  didExercise,
  didMeaningfulThing,
  note,
  createdAt: now(),
  updatedAt: now(),
});

const buildCareer = (
  date: string,
  type: CareerEntry['type'],
  company: string,
  roleTitle: string,
  quantity: number,
  energyAfterCall: number | null,
  alignedNote: string,
  misalignedNote: string,
  note: string,
): CareerEntry => ({
  id: createId(),
  date,
  type,
  quantity,
  company,
  roleTitle,
  energyAfterCall,
  alignedNote,
  misalignedNote,
  note,
  createdAt: now(),
});
