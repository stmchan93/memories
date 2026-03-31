import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { todayDateInput } from '../lib/dates';
import {
  formatDecimal,
  formatIsoDate,
  getDailyCheckinByDate,
  getExperimentSummary,
  getRecentDailyCheckins,
  getSignalSummary,
} from '../lib/metrics';
import type { AppData, DailyCheckin } from '../types';

type DailyRouteProps = {
  data: AppData;
  onSave: (checkin: Omit<DailyCheckin, 'id' | 'createdAt' | 'updatedAt'>) => void;
};

type DailyDraft = {
  date: string;
  mood: number;
  selfTrust: number;
  hoursBuilding: string;
  hoursJobSearching: string;
  didExercise: boolean;
  didMeaningfulThing: boolean;
  note: string;
};

const createEmptyDraft = (date = todayDateInput()): DailyDraft => ({
  date,
  mood: 5,
  selfTrust: 5,
  hoursBuilding: '0',
  hoursJobSearching: '0',
  didExercise: false,
  didMeaningfulThing: false,
  note: '',
});

const toDraft = (checkin: DailyCheckin): DailyDraft => ({
  date: checkin.date,
  mood: checkin.mood,
  selfTrust: checkin.selfTrust,
  hoursBuilding: String(checkin.hoursBuilding),
  hoursJobSearching: String(checkin.hoursJobSearching),
  didExercise: checkin.didExercise,
  didMeaningfulThing: checkin.didMeaningfulThing,
  note: checkin.note,
});

const validateDraft = (draft: DailyDraft) => {
  const errors: Partial<Record<'date' | 'hoursBuilding' | 'hoursJobSearching', string>> = {};

  if (!draft.date) {
    errors.date = 'Required';
  }

  for (const field of ['hoursBuilding', 'hoursJobSearching'] as const) {
    const value = draft[field];

    if (value.trim() === '') {
      continue;
    }

    if (Number.isNaN(Number.parseFloat(value)) || Number.parseFloat(value) < 0) {
      errors[field] = 'Enter a valid non-negative number';
    }
  }

  return errors;
};

const parseHours = (value: string) => (value.trim() === '' ? 0 : Number.parseFloat(value));

export function DailyRoute({ data, onSave }: DailyRouteProps) {
  const today = todayDateInput();
  const [selectedDate, setSelectedDate] = useState(() => todayDateInput());
  const [draft, setDraft] = useState<DailyDraft>(() => createEmptyDraft());
  const [errors, setErrors] = useState<
    Partial<Record<'date' | 'hoursBuilding' | 'hoursJobSearching', string>>
  >({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const existingCheckin = getDailyCheckinByDate(data.dailyCheckins, selectedDate);
  const experimentSummary = getExperimentSummary(data.dailyCheckins);
  const signalSummary = getSignalSummary(data.dailyCheckins);
  const recentCheckins = getRecentDailyCheckins(data.dailyCheckins, 6);

  useEffect(() => {
    setDraft(existingCheckin ? toDraft(existingCheckin) : createEmptyDraft(selectedDate));
    setErrors({});
    setSaveMessage(null);
  }, [existingCheckin, selectedDate]);

  const handleRangeChange = (
    field: 'mood' | 'selfTrust',
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: Number.parseInt(value, 10),
    }));
  };

  const handleTextChange = (
    field: 'hoursBuilding' | 'hoursJobSearching' | 'note',
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setSaveMessage(null);
  };

  const handleToggleChange = (
    field: 'didExercise' | 'didMeaningfulThing',
    value: boolean,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setSaveMessage(null);
  };

  const handleDateChange = (value: string) => {
    const nextDate = value || todayDateInput();
    setSelectedDate(nextDate);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateDraft(draft);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      date: draft.date,
      mood: draft.mood,
      selfTrust: draft.selfTrust,
      hoursBuilding: parseHours(draft.hoursBuilding),
      hoursJobSearching: parseHours(draft.hoursJobSearching),
      didExercise: draft.didExercise,
      didMeaningfulThing: draft.didMeaningfulThing,
      note: draft.note.trim(),
    });

    setSaveMessage(
      existingCheckin
        ? `Updated check-in for ${formatIsoDate(draft.date)}.`
        : `Saved check-in for ${formatIsoDate(draft.date)}.`,
    );
  };

  return (
    <div className="route-layout">
      <section className="feature-card home-hero">
        <div className="hero-copy-block">
          <p className="section-kicker">Daily</p>
          <h2>Keep the daily entry light enough to actually do.</h2>
          <p className="body-copy">
            This should take about a minute. Save again for the same date and it
            updates that day instead of creating a duplicate.
          </p>
        </div>

        <div className="glance-grid">
          <GlanceMetric label="Build streak" value={`${experimentSummary.buildStreak} days`} />
          <GlanceMetric label="Workout streak" value={`${experimentSummary.workoutStreak} days`} />
          <GlanceMetric
            label="Mood 7d avg"
            value={formatDecimal(signalSummary.mood7dAvg, 1)}
          />
          <GlanceMetric
            label="Latest self-trust"
            value={formatDecimal(signalSummary.latestSelfTrust, 1)}
          />
        </div>
      </section>

      <section className="daily-grid">
        <article className="feature-card">
          <div className="card-header">
            <div>
              <p className="section-kicker">Check-in</p>
              <h2>
                {selectedDate === today
                  ? "Today's check-in"
                  : `Check-in for ${formatIsoDate(selectedDate)}`}
              </h2>
            </div>

            {selectedDate !== today ? (
              <button
                className="ghost-button compact-button"
                type="button"
                onClick={() => handleDateChange(today)}
              >
                Jump to today
              </button>
            ) : null}
          </div>

          {saveMessage ? <p className="save-banner">{saveMessage}</p> : null}

          <form className="daily-form" onSubmit={handleSubmit}>
            <p className="form-note">
              Fast version: how it felt, roughly how time was spent, and whether
              you exercised or did one thing that mattered.
            </p>

            <Field
              label="Date"
              hint="Pick a day to add or edit. One entry per day."
              error={errors.date}
            >
              <input
                type="date"
                value={draft.date}
                onChange={(event) => handleDateChange(event.target.value)}
              />
            </Field>

            <p className="section-kicker">How it felt</p>
            <div className="slider-grid">
              <RangeField
                label="Mood"
                value={draft.mood}
                hint="How the day felt overall, regardless of productivity."
                onChange={(value) => handleRangeChange('mood', value)}
              />
              <RangeField
                label="Self-trust"
                value={draft.selfTrust}
                hint="How much you trusted yourself to use the day well."
                onChange={(value) => handleRangeChange('selfTrust', value)}
              />
            </div>

            <p className="section-kicker">What I did</p>
            <div className="field-grid">
              <Field
                label="Build time (hours)"
                hint="Total time spent making or shipping something."
                error={errors.hoursBuilding}
              >
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={draft.hoursBuilding}
                  onChange={(event) =>
                    handleTextChange('hoursBuilding', event.target.value)
                  }
                />
              </Field>

              <Field
                label="Job search time (hours)"
                hint="Applications, outreach, interviews, or career research."
                error={errors.hoursJobSearching}
              >
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={draft.hoursJobSearching}
                  onChange={(event) =>
                    handleTextChange('hoursJobSearching', event.target.value)
                  }
                />
              </Field>
            </div>

            <div className="toggle-grid">
              <ToggleField
                label="Did I exercise?"
                value={draft.didExercise}
                trueLabel="Yes"
                falseLabel="No"
                onChange={(value) => handleToggleChange('didExercise', value)}
              />
              <ToggleField
                label="Did I do one thing that mattered?"
                value={draft.didMeaningfulThing}
                trueLabel="Yes"
                falseLabel="No"
                onChange={(value) => handleToggleChange('didMeaningfulThing', value)}
              />
            </div>

            <Field
              label="Short note"
              hint="Keep it brief so the habit stays easy."
            >
              <textarea
                rows={4}
                placeholder="Good build session. Avoided outreach longer than I should have."
                value={draft.note}
                onChange={(event) => handleTextChange('note', event.target.value)}
              />
            </Field>

            <div className="form-actions">
              <button className="primary-button" type="submit">
                {existingCheckin ? 'Update check-in' : 'Save check-in'}
              </button>
            </div>
          </form>
        </article>

        <aside className="daily-side-column">
          <article className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">This week</p>
                <h2>Momentum summary</h2>
              </div>
            </div>

            <div className="mini-metric-grid">
              <MiniMetric
                label="Hours built"
                value={formatDecimal(experimentSummary.hoursBuiltThisWeek, 1)}
              />
              <MiniMetric
                label="Job search hours"
                value={formatDecimal(experimentSummary.hoursJobSearchingThisWeek, 1)}
              />
              <MiniMetric
                label="Last 7 days logged"
                value={`${signalSummary.checkinsLast7Days}`}
              />
              <MiniMetric
                label="Entries saved"
                value={`${data.dailyCheckins.length}`}
              />
            </div>
          </article>

          <article className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">Recent</p>
                <h2>Last check-ins</h2>
              </div>
            </div>

            {recentCheckins.length > 0 ? (
              <div className="entry-list">
                {recentCheckins.map((checkin) => (
                  <EntryRow key={checkin.id} checkin={checkin} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No daily entries yet.</strong>
                <p>
                  The first saved check-in will start populating streaks, weekly
                  totals, and the signal cards on Home.
                </p>
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

function RangeField({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  hint: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="slider-field">
      <div className="slider-header">
        <span className="field-label">{label}</span>
        <strong className="slider-value">{value}/10</strong>
      </div>
      <p className="slider-hint">{hint}</p>
      <input
        className="range-input"
        type="range"
        min="1"
        max="10"
        step="1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="slider-scale">
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  );
}

function ToggleField({
  label,
  value,
  trueLabel,
  falseLabel,
  onChange,
}: {
  label: string;
  value: boolean;
  trueLabel: string;
  falseLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="toggle-field">
      <span className="field-label">{label}</span>
      <div className="toggle-options">
        <button
          className={value ? 'toggle-option active' : 'toggle-option'}
          type="button"
          onClick={() => onChange(true)}
        >
          {trueLabel}
        </button>
        <button
          className={!value ? 'toggle-option active' : 'toggle-option'}
          type="button"
          onClick={() => onChange(false)}
        >
          {falseLabel}
        </button>
      </div>
    </div>
  );
}

function GlanceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="glance-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EntryRow({ checkin }: { checkin: DailyCheckin }) {
  return (
    <div className="entry-row">
      <div className="entry-row-header">
        <strong>{formatIsoDate(checkin.date)}</strong>
        <span>Mood {checkin.mood}/10</span>
      </div>
      <div className="entry-chip-row">
        <span className="entry-chip">{checkin.hoursBuilding}h build</span>
        <span className="entry-chip">{checkin.hoursJobSearching}h search</span>
        <span className="entry-chip">Self-trust {checkin.selfTrust}/10</span>
        <span className="entry-chip">
          Exercise {checkin.didExercise ? 'yes' : 'no'}
        </span>
      </div>
      {checkin.note ? <p className="entry-note">{checkin.note}</p> : null}
    </div>
  );
}
