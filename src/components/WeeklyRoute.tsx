import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { formatDateInput } from '../lib/dates';
import {
  formatDecimal,
  formatIsoDate,
  getCareerSummary,
  getExperimentSummary,
  getLatestWeeklyReview,
  getRecentWeeklyReviews,
  getSignalSummary,
} from '../lib/metrics';
import type { AppData, WeeklyBalance, WeeklyReview } from '../types';

const getDefaultWeekEndingDate = () => {
  const date = new Date();
  const day = date.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  date.setDate(date.getDate() + daysUntilSunday);

  return formatDateInput(date);
};

type WeeklyRouteProps = {
  data: AppData;
  onSave: (review: Omit<WeeklyReview, 'id' | 'createdAt'>) => void;
};

type WeeklyDraft = {
  weekEndingDate: string;
  weekSummary: string;
  gaveEnergy: string;
  drainedEnergy: string;
  avoided: string;
  didBuildingFeelGood: 'yes' | 'no' | 'unsure';
  nextWeekBalance: WeeklyBalance;
  weeklyFocus: string;
  runwayUpdateNote: string;
};

const initialDraft = (): WeeklyDraft => ({
  weekEndingDate: getDefaultWeekEndingDate(),
  weekSummary: '',
  gaveEnergy: '',
  drainedEnergy: '',
  avoided: '',
  didBuildingFeelGood: 'unsure',
  nextWeekBalance: 'balanced',
  weeklyFocus: '',
  runwayUpdateNote: '',
});

const toDraft = (review: WeeklyReview): WeeklyDraft => ({
  weekEndingDate: review.weekEndingDate,
  weekSummary: review.weekSummary ?? '',
  gaveEnergy: review.gaveEnergy,
  drainedEnergy: review.drainedEnergy,
  avoided: review.avoided,
  didBuildingFeelGood:
    review.didBuildingFeelGood === null
      ? 'unsure'
      : review.didBuildingFeelGood
        ? 'yes'
        : 'no',
  nextWeekBalance: review.nextWeekBalance,
  weeklyFocus: review.weeklyFocus,
  runwayUpdateNote: review.runwayUpdateNote,
});

const validateDraft = (draft: WeeklyDraft) => {
  const errors: Partial<Record<'weekEndingDate' | 'weekSummary' | 'weeklyFocus', string>> = {};

  if (!draft.weekEndingDate) {
    errors.weekEndingDate = 'Required';
  }

  if (!draft.weekSummary.trim()) {
    errors.weekSummary = 'Required';
  }

  if (!draft.weeklyFocus.trim()) {
    errors.weeklyFocus = 'Required';
  }

  return errors;
};

export function WeeklyRoute({ data, onSave }: WeeklyRouteProps) {
  const [selectedWeekEndingDate, setSelectedWeekEndingDate] = useState(getDefaultWeekEndingDate());
  const [draft, setDraft] = useState<WeeklyDraft>(() => initialDraft());
  const [errors, setErrors] = useState<
    Partial<Record<'weekEndingDate' | 'weekSummary' | 'weeklyFocus', string>>
  >({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showReflectionPrompts, setShowReflectionPrompts] = useState(false);

  const existingReview =
    data.weeklyReviews.find((review) => review.weekEndingDate === selectedWeekEndingDate) ?? null;
  const latestReview = getLatestWeeklyReview(data.weeklyReviews);
  const recentReviews = getRecentWeeklyReviews(data.weeklyReviews, 6);
  const experimentSummary = getExperimentSummary(data.dailyCheckins);
  const careerSummary = getCareerSummary(data.careerEntries);
  const signalSummary = getSignalSummary(data.dailyCheckins);
  const currentWeeklyFocus =
    latestReview?.weeklyFocus ||
    'Bias toward building in the morning and doing fewer, higher-quality career actions.';

  useEffect(() => {
    setDraft(existingReview ? toDraft(existingReview) : { ...initialDraft(), weekEndingDate: selectedWeekEndingDate });
    setErrors({});
    setSaveMessage(null);
    setShowReflectionPrompts(
      Boolean(
        existingReview?.gaveEnergy ||
          existingReview?.drainedEnergy ||
          existingReview?.avoided,
      ),
    );
  }, [existingReview, selectedWeekEndingDate]);

  const handleChange = (
    field:
      | 'weekEndingDate'
      | 'weekSummary'
      | 'gaveEnergy'
      | 'drainedEnergy'
      | 'avoided'
      | 'weeklyFocus'
      | 'runwayUpdateNote',
    value: string,
  ) => {
    if (field === 'weekEndingDate') {
      const nextDate = value || getDefaultWeekEndingDate();
      setSelectedWeekEndingDate(nextDate);
      return;
    }

    setDraft((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === 'weekSummary' || field === 'weeklyFocus') {
      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
    }

    setSaveMessage(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateDraft(draft);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave({
      weekEndingDate: draft.weekEndingDate,
      weekSummary: draft.weekSummary.trim(),
      gaveEnergy: draft.gaveEnergy.trim(),
      drainedEnergy: draft.drainedEnergy.trim(),
      avoided: draft.avoided.trim(),
      didBuildingFeelGood:
        draft.didBuildingFeelGood === 'unsure'
          ? null
          : draft.didBuildingFeelGood === 'yes',
      nextWeekBalance: draft.nextWeekBalance,
      weeklyFocus: draft.weeklyFocus.trim(),
      runwayUpdateNote: draft.runwayUpdateNote.trim(),
    });

    setSaveMessage(
      existingReview
        ? `Updated weekly review for ${formatIsoDate(draft.weekEndingDate)}.`
        : `Saved weekly review for ${formatIsoDate(draft.weekEndingDate)}.`,
    );
  };

  return (
    <div className="route-layout">
      <section className="feature-card home-hero">
        <div className="hero-copy-block">
          <p className="section-kicker">Weekly</p>
          <h2>Turn raw activity into a real next-step decision.</h2>
          <p className="support-note support-note-plain">
            <strong>Current weekly focus:</strong> {currentWeeklyFocus}
          </p>
        </div>

        <div className="hero-copy-block">
          <div className="glance-grid">
            <GlanceMetric
              label="Build hours this week"
              value={formatDecimal(experimentSummary.hoursBuiltThisWeek, 1)}
            />
            <GlanceMetric
              label="Interviews this week"
              value={`${careerSummary.interviews}`}
            />
            <GlanceMetric
              label="Mood 7d avg"
              value={formatDecimal(signalSummary.mood7dAvg, 1)}
            />
            <GlanceMetric
              label="Reviews saved"
              value={`${data.weeklyReviews.length}`}
            />
          </div>
        </div>
      </section>

      <section className="daily-grid">
        <article className="feature-card">
          <div className="card-header">
            <div>
              <p className="section-kicker">Review</p>
              <h2>{existingReview ? 'Update weekly review' : 'Weekly review'}</h2>
            </div>
          </div>

          {saveMessage ? <p className="save-banner">{saveMessage}</p> : null}

          <form className="daily-form" onSubmit={handleSubmit}>
            <p className="form-note">
              Keep this simple: how did this week go, and what should next week
              focus on?
            </p>

            <Field
              label="Week ending date"
              error={errors.weekEndingDate}
            >
              <input
                type="date"
                value={draft.weekEndingDate}
                onChange={(event) => handleChange('weekEndingDate', event.target.value)}
              />
            </Field>

            <Field
              label="How did this week go?"
              error={errors.weekSummary}
            >
              <textarea
                rows={4}
                placeholder="Building felt more grounded. Job search was lighter, but the actions were better."
                value={draft.weekSummary}
                onChange={(event) => handleChange('weekSummary', event.target.value)}
              />
            </Field>

            <Field
              label="Next week's focus"
              error={errors.weeklyFocus}
            >
              <textarea
                rows={3}
                placeholder="Bias toward building in the morning and doing fewer, higher-quality career actions."
                value={draft.weeklyFocus}
                onChange={(event) => handleChange('weeklyFocus', event.target.value)}
              />
            </Field>

            <details
              className="optional-details inline-details"
              open={showReflectionPrompts}
              onToggle={(event) => setShowReflectionPrompts(event.currentTarget.open)}
            >
              <summary>Optional reflection prompts</summary>
              <p className="details-copy">
                Use these when you want more signal than a focus statement alone
                gives you.
              </p>

              <div className="field-grid">
                <Field
                  label="What gave me energy?"
                >
                  <textarea
                    rows={4}
                    placeholder="Building for a few focused hours. Talking to people I actually like."
                    value={draft.gaveEnergy}
                    onChange={(event) => handleChange('gaveEnergy', event.target.value)}
                  />
                </Field>

                <Field
                  label="What drained me?"
                >
                  <textarea
                    rows={4}
                    placeholder="Open-ended browsing. Low-signal outreach. Too much context switching."
                    value={draft.drainedEnergy}
                    onChange={(event) => handleChange('drainedEnergy', event.target.value)}
                  />
                </Field>
              </div>

              <Field
                label="What did I avoid?"
              >
                <textarea
                  rows={4}
                  placeholder="Following up with two people. Shipping a rough version."
                  value={draft.avoided}
                  onChange={(event) => handleChange('avoided', event.target.value)}
                />
              </Field>

            </details>

            <div className="form-actions">
              <button className="primary-button" type="submit">
                {existingReview ? 'Update weekly review' : 'Save weekly review'}
              </button>
            </div>
          </form>
        </article>

        <aside className="daily-side-column">
          <article className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">This week</p>
                <h2>Current signals</h2>
              </div>
            </div>

            <div className="mini-metric-grid">
              <MiniMetric
                label="Job search hours"
                value={formatDecimal(experimentSummary.hoursJobSearchingThisWeek, 1)}
              />
              <MiniMetric
                label="Applications"
                value={`${careerSummary.applications}`}
              />
              <MiniMetric
                label="Latest self-trust"
                value={formatDecimal(signalSummary.latestSelfTrust, 1)}
              />
              <MiniMetric
                label="Review cadence"
                value={`${data.weeklyReviews.length} saved`}
              />
            </div>
          </article>

          <article className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">Recent</p>
                <h2>Latest weekly reviews</h2>
              </div>
            </div>

            {recentReviews.length > 0 ? (
              <div className="entry-list">
                {recentReviews.map((review) => (
                  <WeeklyReviewRow key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No weekly reviews yet.</strong>
                <p>
                  The first review should end with one concrete focus for next week
                  and one honest note about what felt aligned or off.
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

function WeeklyReviewRow({ review }: { review: WeeklyReview }) {
  return (
    <div className="entry-row">
      <div className="entry-row-header">
        <strong>{formatIsoDate(review.weekEndingDate)}</strong>
      </div>
      {review.weekSummary ? <p className="entry-note">Week: {review.weekSummary}</p> : null}
      <p className="entry-note">Focus: {review.weeklyFocus}</p>
      {review.gaveEnergy ? <p className="entry-note">Energy: {review.gaveEnergy}</p> : null}
      {review.avoided ? <p className="entry-note">Avoided: {review.avoided}</p> : null}
    </div>
  );
}
