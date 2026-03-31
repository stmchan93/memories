import { useEffect, useState } from 'react';
import './app.css';
import { CareerRoute } from './components/CareerRoute';
import { DailyRoute } from './components/DailyRoute';
import { HomeRoute } from './components/HomeRoute';
import { MoneyRoute } from './components/MoneyRoute';
import { RoutePlaceholder } from './components/RoutePlaceholder';
import { SetupView } from './components/SetupView';
import { WeeklyRoute } from './components/WeeklyRoute';
import { createDemoAppData } from './lib/demoData';
import { todayDateInput } from './lib/dates';
import { getLatestMoneySnapshot } from './lib/metrics';
import {
  buildInitialData,
  createEmptyAppData,
  createId,
  loadAppData,
  saveAppData,
} from './lib/storage';
import type {
  AppData,
  AppRoute,
  CareerEntry,
  DailyCheckin,
  MoneySnapshot,
  Profile,
  SetupInput,
  WeeklyReview,
} from './types';

const routes: Array<{
  id: AppRoute;
  label: string;
}> = [
  { id: 'home', label: 'Home' },
  { id: 'daily', label: 'Daily' },
  { id: 'career', label: 'Career' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'money', label: 'Money' },
];

const createInitialSetupInput = (): SetupInput => {
  const today = todayDateInput();

  return {
    unemploymentStartDate: today,
    targetDecisionDate: '',
    panicThresholdCash: '',
    snapshotDate: today,
    liquidCash: '',
    note: '',
  };
};

const requiredNumberFields: Array<keyof Pick<SetupInput, 'liquidCash'>> = ['liquidCash'];

const optionalNumberFields: Array<keyof Pick<SetupInput, 'panicThresholdCash'>> = [
  'panicThresholdCash',
];

const isAppRoute = (value: string): value is AppRoute =>
  routes.some((route) => route.id === value);

const readRouteFromHash = (): AppRoute => {
  if (typeof window === 'undefined') {
    return 'home';
  }

  const hash = window.location.hash.replace('#', '');

  return isAppRoute(hash) ? hash : 'home';
};

const validateSetup = (input: SetupInput) => {
  const errors: Partial<Record<keyof SetupInput, string>> = {};

  if (!input.unemploymentStartDate) {
    errors.unemploymentStartDate = 'Required';
  }

  for (const field of requiredNumberFields) {
    const value = input[field];

    if (value.trim() === '') {
      errors[field] = 'Required';
      continue;
    }

    if (Number.isNaN(Number.parseFloat(value)) || Number.parseFloat(value) < 0) {
      errors[field] = 'Enter a valid non-negative number';
    }
  }

  for (const field of optionalNumberFields) {
    const value = input[field];

    if (value.trim() === '') {
      continue;
    }

    if (Number.isNaN(Number.parseFloat(value)) || Number.parseFloat(value) < 0) {
      errors[field] = 'Enter a valid non-negative number';
    }
  }

  return errors;
};

function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [setupInput, setSetupInput] = useState<SetupInput>(() => createInitialSetupInput());
  const [errors, setErrors] = useState<Partial<Record<keyof SetupInput, string>>>({});
  const [route, setRoute] = useState<AppRoute>(() => readRouteFromHash());

  const latestSnapshot = getLatestMoneySnapshot(data);
  const profile = data.profile;
  const hasCompletedSetup = Boolean(profile && latestSnapshot);

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (!hasCompletedSetup) {
      setRoute('home');

      return undefined;
    }

    const syncRoute = () => {
      setRoute(readRouteFromHash());
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
    };
  }, [hasCompletedSetup]);

  const navigate = (nextRoute: AppRoute) => {
    if (typeof window === 'undefined') {
      setRoute(nextRoute);
      return;
    }

    const nextHash = `#${nextRoute}`;

    if (window.location.hash === nextHash) {
      setRoute(nextRoute);
      return;
    }

    window.location.hash = nextHash;
  };

  const handleSetupChange = (field: keyof SetupInput, value: string) => {
    setSetupInput((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const handleSetupSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateSetup(setupInput);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setData(buildInitialData(setupInput));
    navigate('home');
  };

  const handleReset = () => {
    setData(createEmptyAppData());
    setSetupInput(createInitialSetupInput());
    setErrors({});

    if (typeof window !== 'undefined') {
      window.location.hash = '#home';
    }
  };

  const handleLoadDemoData = () => {
    setData(createDemoAppData());
    setSetupInput(createInitialSetupInput());
    setErrors({});
    navigate('home');
  };

  const handleSaveDailyCheckin = (
    nextCheckin: Omit<DailyCheckin, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    const now = new Date().toISOString();

    setData((current) => {
      const existing = current.dailyCheckins.find(
        (checkin) => checkin.date === nextCheckin.date,
      );

      const savedCheckin: DailyCheckin = existing
        ? {
            ...existing,
            ...nextCheckin,
            updatedAt: now,
          }
        : {
            ...nextCheckin,
            id: createId(),
            createdAt: now,
            updatedAt: now,
          };

      const otherCheckins = current.dailyCheckins.filter(
        (checkin) => checkin.date !== nextCheckin.date,
      );

      return {
        ...current,
        dailyCheckins: [...otherCheckins, savedCheckin].sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      };
    });
  };

  const handleSaveCareerEntry = (nextEntry: Omit<CareerEntry, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();

    setData((current) => ({
      ...current,
      careerEntries: [
        {
          ...nextEntry,
          id: createId(),
          createdAt: now,
        },
        ...current.careerEntries,
      ].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    }));
  };

  const handleSaveWeeklyReview = (
    nextReview: Omit<WeeklyReview, 'id' | 'createdAt'>,
  ) => {
    const now = new Date().toISOString();

    setData((current) => {
      const existing = current.weeklyReviews.find(
        (review) => review.weekEndingDate === nextReview.weekEndingDate,
      );

      const savedReview: WeeklyReview = existing
        ? {
            ...existing,
            ...nextReview,
          }
        : {
            ...nextReview,
            id: createId(),
            createdAt: now,
          };

      const otherReviews = current.weeklyReviews.filter(
        (review) => review.weekEndingDate !== nextReview.weekEndingDate,
      );

      return {
        ...current,
        weeklyReviews: [...otherReviews, savedReview].sort((a, b) =>
          b.weekEndingDate.localeCompare(a.weekEndingDate),
        ),
      };
    });
  };

  const handleUpdateProfile = (
    nextProfileFields: Pick<Profile, 'targetDecisionDate' | 'panicThresholdCash'>,
  ) => {
    setData((current) => {
      if (!current.profile) {
        return current;
      }

      return {
        ...current,
        profile: {
          ...current.profile,
          ...nextProfileFields,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleSaveMoneySnapshot = (
    nextSnapshot: Omit<MoneySnapshot, 'id' | 'createdAt'>,
  ) => {
    const now = new Date().toISOString();

    setData((current) => {
      const existing = current.moneySnapshots.find(
        (snapshot) => snapshot.snapshotDate === nextSnapshot.snapshotDate,
      );

      const savedSnapshot: MoneySnapshot = existing
        ? {
            ...existing,
            ...nextSnapshot,
          }
        : {
            ...nextSnapshot,
            id: createId(),
            createdAt: now,
          };

      const otherSnapshots = current.moneySnapshots.filter(
        (snapshot) => snapshot.snapshotDate !== nextSnapshot.snapshotDate,
      );

      return {
        ...current,
        moneySnapshots: [...otherSnapshots, savedSnapshot].sort((a, b) =>
          b.snapshotDate.localeCompare(a.snapshotDate),
        ),
      };
    });
  };

  if (!hasCompletedSetup) {
    return (
      <SetupView
        input={setupInput}
        errors={errors}
        onChange={handleSetupChange}
        onLoadDemoData={handleLoadDemoData}
        onSubmit={handleSetupSubmit}
      />
    );
  }

  return (
    <main className="app-shell dashboard-shell">
      <header className="shell-header">
        <div className="shell-copy">
          <p className="eyebrow">Runway</p>
          <h1>Personal dashboard for the in-between.</h1>
          <p className="body-copy">
            Local-first, lightweight, and intentionally narrow: track time,
            runway, career moves, daily signals, and the weekly review without
            turning this into life-admin software.
          </p>
        </div>

        <div className="shell-actions">
          <button className="ghost-button" type="button" onClick={handleReset}>
            Reset local data
          </button>
        </div>
      </header>

      <nav className="route-nav" aria-label="Primary">
        {routes.map((navRoute) => (
          <button
            key={navRoute.id}
            className={navRoute.id === route ? 'route-chip active' : 'route-chip'}
            type="button"
            onClick={() => navigate(navRoute.id)}
          >
            <span>{navRoute.label}</span>
          </button>
        ))}
      </nav>

      <section className="route-frame">
        {route === 'home' ? (
          <HomeRoute data={data} onNavigate={navigate} />
        ) : route === 'daily' ? (
          <DailyRoute data={data} onSave={handleSaveDailyCheckin} />
        ) : route === 'career' ? (
          <CareerRoute data={data} onSave={handleSaveCareerEntry} />
        ) : route === 'weekly' ? (
          <WeeklyRoute data={data} onSave={handleSaveWeeklyReview} />
        ) : route === 'money' ? (
          <MoneyRoute
            data={data}
            onUpdateProfile={handleUpdateProfile}
            onSaveSnapshot={handleSaveMoneySnapshot}
          />
        ) : (
          <RoutePlaceholder route={route} onNavigate={navigate} />
        )}
      </section>
    </main>
  );
}

export default App;
