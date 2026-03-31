import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { todayDateInput } from '../lib/dates';
import {
  formatBurnRateLabel,
  formatCurrency,
  formatIsoDate,
  formatRunwayLabel,
  getLatestMoneySnapshot,
  getMoneyBurnEstimate,
  getPanicThresholdDate,
  getRecentMoneySnapshots,
  getRunwayMonths,
  getSnapshotTrend,
} from '../lib/metrics';
import type { AppData, MoneySnapshot, Profile } from '../types';

const DAYS_PER_MONTH = 30.44;

type MoneyRouteProps = {
  data: AppData;
  onUpdateProfile: (
    profile: Pick<Profile, 'targetDecisionDate' | 'panicThresholdCash'>,
  ) => void;
  onSaveSnapshot: (snapshot: Omit<MoneySnapshot, 'id' | 'createdAt'>) => void;
};

type ProfileDraft = {
  targetDecisionDate: string;
  panicThresholdCash: string;
};

type SnapshotDraft = {
  snapshotDate: string;
  liquidCash: string;
  note: string;
};

const toProfileDraft = (profile: Profile): ProfileDraft => ({
  targetDecisionDate: profile.targetDecisionDate ?? '',
  panicThresholdCash:
    profile.panicThresholdCash == null ? '' : String(profile.panicThresholdCash),
});

const createSnapshotDraft = (
  snapshot: MoneySnapshot | null,
  snapshotDate = todayDateInput(),
): SnapshotDraft =>
  snapshot
    ? {
        snapshotDate: snapshot.snapshotDate,
        liquidCash: String(snapshot.liquidCash),
        note: snapshot.note,
      }
    : {
        snapshotDate,
        liquidCash: '',
        note: '',
      };

const validateProfileDraft = (draft: ProfileDraft) => {
  const errors: Partial<Record<keyof ProfileDraft, string>> = {};

  if (!draft.panicThresholdCash.trim()) {
    return errors;
  }

  if (
    Number.isNaN(Number.parseFloat(draft.panicThresholdCash)) ||
    Number.parseFloat(draft.panicThresholdCash) < 0
  ) {
    errors.panicThresholdCash = 'Enter a valid non-negative number';
  }

  return errors;
};

const validateSnapshotDraft = (draft: SnapshotDraft) => {
  const errors: Partial<Record<'snapshotDate' | 'liquidCash', string>> = {};

  if (!draft.snapshotDate) {
    errors.snapshotDate = 'Required';
  }

  if (!draft.liquidCash.trim()) {
    errors.liquidCash = 'Required';
    return errors;
  }

  if (
    Number.isNaN(Number.parseFloat(draft.liquidCash)) ||
    Number.parseFloat(draft.liquidCash) < 0
  ) {
    errors.liquidCash = 'Enter a valid non-negative number';
  }

  return errors;
};

export function MoneyRoute({ data, onUpdateProfile, onSaveSnapshot }: MoneyRouteProps) {
  const profile = data.profile;
  const latestSnapshot = getLatestMoneySnapshot(data);

  if (!profile || !latestSnapshot) {
    return null;
  }

  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => toProfileDraft(profile));
  const [snapshotDate, setSnapshotDate] = useState(() => todayDateInput());
  const selectedSnapshot =
    data.moneySnapshots.find((snapshot) => snapshot.snapshotDate === snapshotDate) ?? null;
  const [snapshotDraft, setSnapshotDraft] = useState<SnapshotDraft>(() => createSnapshotDraft(null));
  const [profileErrors, setProfileErrors] = useState<
    Partial<Record<keyof ProfileDraft, string>>
  >({});
  const [snapshotErrors, setSnapshotErrors] = useState<
    Partial<Record<'snapshotDate' | 'liquidCash', string>>
  >({});
  const [profileSaveMessage, setProfileSaveMessage] = useState<string | null>(null);
  const [snapshotSaveMessage, setSnapshotSaveMessage] = useState<string | null>(null);

  const recentSnapshots = getRecentMoneySnapshots(data.moneySnapshots, 8);
  const startingSnapshot =
    [...data.moneySnapshots].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))[0] ??
    latestSnapshot;
  const burnEstimate = getMoneyBurnEstimate(data.moneySnapshots);
  const estimatedMonthlyBurn = burnEstimate.monthlyBurn;
  const runwayMonths = getRunwayMonths(latestSnapshot, estimatedMonthlyBurn);
  const panicThresholdDate = getPanicThresholdDate(
    profile,
    latestSnapshot,
    estimatedMonthlyBurn,
  );
  const cashFloorLabel =
    profile.panicThresholdCash == null
      ? 'No cash floor set'
      : formatCurrency(profile.panicThresholdCash);
  const cashFloorDateLabel =
    profile.panicThresholdCash == null
      ? 'No cash floor set'
      : formatIsoDate(panicThresholdDate);
  const hasPlanningTargets =
    profile.targetDecisionDate != null || profile.panicThresholdCash != null;
  const [showPlanningTargets, setShowPlanningTargets] = useState(() => hasPlanningTargets);

  useEffect(() => {
    setProfileDraft(toProfileDraft(profile));
  }, [profile]);

  useEffect(() => {
    if (selectedSnapshot) {
      setSnapshotDraft(createSnapshotDraft(selectedSnapshot, snapshotDate));
      setSnapshotErrors({});
      return;
    }

    setSnapshotDraft({
      snapshotDate,
      liquidCash: String(latestSnapshot.liquidCash),
      note: '',
    });
    setSnapshotErrors({});
  }, [latestSnapshot, selectedSnapshot, snapshotDate]);

  const handleProfileChange = (field: keyof ProfileDraft, value: string) => {
    setProfileDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setProfileErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setProfileSaveMessage(null);
  };

  const handleSnapshotChange = (field: keyof SnapshotDraft, value: string) => {
    if (field === 'snapshotDate') {
      setSnapshotDate(value || todayDateInput());
      setSnapshotSaveMessage(null);
      return;
    }

    setSnapshotDraft((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === 'liquidCash') {
      setSnapshotErrors((current) => ({
        ...current,
        liquidCash: undefined,
      }));
    }

    setSnapshotSaveMessage(null);
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateProfileDraft(profileDraft);

    if (Object.keys(nextErrors).length > 0) {
      setProfileErrors(nextErrors);
      return;
    }

    onUpdateProfile({
      targetDecisionDate: profileDraft.targetDecisionDate.trim() || null,
      panicThresholdCash: profileDraft.panicThresholdCash.trim()
        ? Number.parseFloat(profileDraft.panicThresholdCash)
        : null,
    });

    setProfileSaveMessage('Saved planning fields.');
  };

  const handleSnapshotSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateSnapshotDraft(snapshotDraft);

    if (Object.keys(nextErrors).length > 0) {
      setSnapshotErrors(nextErrors);
      return;
    }

    onSaveSnapshot({
      snapshotDate: snapshotDraft.snapshotDate,
      liquidCash: Number.parseFloat(snapshotDraft.liquidCash),
      note: snapshotDraft.note.trim(),
      burnRateOverride: selectedSnapshot?.burnRateOverride ?? null,
    });

    const nextSelectedDate =
      snapshotDraft.snapshotDate >= latestSnapshot.snapshotDate
        ? snapshotDraft.snapshotDate
        : latestSnapshot.snapshotDate;

    setSnapshotDate(nextSelectedDate);
    setSnapshotSaveMessage(
      selectedSnapshot
        ? `Updated checkpoint for ${formatIsoDate(snapshotDraft.snapshotDate)}.`
        : `Saved checkpoint for ${formatIsoDate(snapshotDraft.snapshotDate)}.`,
    );
  };

  return (
    <div className="route-layout">
      <section className="feature-card home-hero">
        <div className="hero-copy-block">
          <p className="section-kicker">Money</p>
          <h2>Log cash checkpoints and let the trend update itself.</h2>
          <p className="body-copy">
            A checkpoint is just a date and the cash you actually have. Once you
            have at least two, Runway can estimate the current burn rate from the
            change over time.
          </p>
        </div>
      </section>

      <section className="daily-grid">
        <div className="money-main-column">
          <article className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">Checkpoint</p>
                <h2>{selectedSnapshot ? 'Update cash checkpoint' : 'Add cash checkpoint'}</h2>
                <p className="body-copy">
                  As you update cash checkpoints over time, Runway can estimate your
                  daily and monthly cash burn from the change.
                </p>
              </div>
            </div>

            {snapshotSaveMessage ? <p className="save-banner">{snapshotSaveMessage}</p> : null}

            <form className="daily-form" onSubmit={handleSnapshotSubmit}>
              <div className="field-grid">
                <Field
                  label="Date"
                  hint="Use one cash checkpoint per date. Saving the same date updates it."
                  error={snapshotErrors.snapshotDate}
                >
                  <input
                    type="date"
                    value={snapshotDraft.snapshotDate}
                    onChange={(event) =>
                      handleSnapshotChange('snapshotDate', event.target.value)
                    }
                  />
                </Field>

                <Field
                  label="Liquid cash"
                  hint="Cash you have remaining"
                  error={snapshotErrors.liquidCash}
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={snapshotDraft.liquidCash}
                    onChange={(event) =>
                      handleSnapshotChange('liquidCash', event.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="form-actions">
                <button className="primary-button" type="submit">
                  {selectedSnapshot ? 'Update checkpoint' : 'Save checkpoint'}
                </button>
              </div>
            </form>
          </article>

          <article className="feature-card">
            <details
              className="optional-details inline-details"
              open={showPlanningTargets}
              onToggle={(event) =>
                setShowPlanningTargets(event.currentTarget.open)
              }
            >
              <summary>Optional planning fields</summary>
              <p className="details-copy">
                Add a cash floor or decision date only if it helps you make clearer
                decisions from the cash trend.
              </p>

              {profileSaveMessage ? <p className="save-banner">{profileSaveMessage}</p> : null}

              <form className="daily-form" onSubmit={handleProfileSubmit}>
                <div className="field-grid">
                  <Field
                    label="Cash floor"
                    hint="The cash amount where things start to feel urgent."
                    error={profileErrors.panicThresholdCash}
                  >
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder="10000"
                      value={profileDraft.panicThresholdCash}
                      onChange={(event) =>
                        handleProfileChange('panicThresholdCash', event.target.value)
                      }
                    />
                  </Field>

                  <Field
                    label="Decision checkpoint date"
                    hint="The date where you want to pause and decide what happens next."
                    error={profileErrors.targetDecisionDate}
                  >
                    <input
                      type="date"
                      value={profileDraft.targetDecisionDate}
                      onChange={(event) =>
                        handleProfileChange('targetDecisionDate', event.target.value)
                      }
                    />
                  </Field>
                </div>

                <div className="form-actions">
                  <button className="primary-button" type="submit">
                    Save planning fields
                  </button>
                </div>
              </form>
            </details>
          </article>
        </div>

        <aside className="daily-side-column">
          <article className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">Current</p>
                <h2>Current picture</h2>
              </div>
            </div>

            <div className="metric-stack">
              <Metric
                label="Starting cash"
                value={formatCurrency(startingSnapshot.liquidCash)}
              />
              <Metric label="Cash left" value={formatCurrency(latestSnapshot.liquidCash)} />
              <Metric
                label="Average burn / month"
                value={formatAverageBurnPerMonth(estimatedMonthlyBurn)}
              />
              <Metric
                label="Average burn / day"
                value={formatAverageBurnPerDay(estimatedMonthlyBurn)}
              />
              <Metric label="Runway left" value={formatRunwayLabel(runwayMonths)} />
              <Metric label="Cash floor" value={cashFloorLabel} />
              <Metric label="Cash floor date" value={cashFloorDateLabel} />
              <Metric
                label="Decision checkpoint"
                value={formatIsoDate(profile.targetDecisionDate)}
              />
            </div>

            {burnEstimate.source === 'derived' && burnEstimate.previousSnapshotDate ? (
              <p className="support-note">
                Estimated from the cash change between{' '}
                {formatIsoDate(burnEstimate.previousSnapshotDate)} and{' '}
                {formatIsoDate(latestSnapshot.snapshotDate)}.
              </p>
            ) : burnEstimate.source === 'override' ? (
              <p className="support-note">
                Using a saved burn estimate from older data. Add one more cash checkpoint
                to replace it with a derived estimate.
              </p>
            ) : (
              <p className="support-note">
                Add one more cash checkpoint to start estimating monthly burn from
                your actual cash trend.
              </p>
            )}
          </article>

          <article className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">History</p>
                <h2>Recent cash checkpoints</h2>
              </div>
            </div>

            {recentSnapshots.length > 0 ? (
              <div className="entry-list">
                {recentSnapshots.map((snapshot, index) => (
                  <SnapshotRow
                    key={snapshot.id}
                    snapshot={snapshot}
                    olderSnapshot={recentSnapshots[index + 1] ?? null}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No cash checkpoints yet.</strong>
                <p>
                  Add a dated cash checkpoint whenever your available cash changes
                  enough that you want the picture to stay honest.
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const formatBurnRateDetail = (value: number | null) => {
  if (value == null || value <= 0) {
    return formatBurnRateLabel(value);
  }

  return `${formatCurrency(value / DAYS_PER_MONTH)} / day • ${formatCurrency(value)} / month`;
};

const formatAverageBurnPerMonth = (value: number | null) => {
  if (value == null || value <= 0) {
    return 'Need 1 more checkpoint';
  }

  return formatCurrency(value);
};

const formatAverageBurnPerDay = (value: number | null) => {
  if (value == null || value <= 0) {
    return 'Need 1 more checkpoint';
  }

  return formatCurrency(value / DAYS_PER_MONTH);
};

function SnapshotRow({
  snapshot,
  olderSnapshot,
}: {
  snapshot: MoneySnapshot;
  olderSnapshot: MoneySnapshot | null;
}) {
  const trend = olderSnapshot ? getSnapshotTrend(snapshot, olderSnapshot) : null;

  return (
    <div className="entry-row">
      <div className="entry-row-header">
        <strong>{formatIsoDate(snapshot.snapshotDate)}</strong>
        <span>{formatCurrency(snapshot.liquidCash)}</span>
      </div>
      {trend ? (
        <>
          <p className="entry-note">
            {trend.cashChange > 0
              ? `Cash down ${formatCurrency(trend.cashChange)} over ${trend.daysBetween} days.`
              : trend.cashChange < 0
                ? `Cash up ${formatCurrency(Math.abs(trend.cashChange))} over ${trend.daysBetween} days.`
                : `Cash was flat over ${trend.daysBetween} days.`}
          </p>
          <p className="entry-note">
            Implied burn: {formatBurnRateDetail(trend.impliedMonthlyBurn)}
          </p>
        </>
      ) : snapshot.burnRateOverride != null ? (
        <p className="entry-note">
          Saved burn estimate: {formatBurnRateDetail(snapshot.burnRateOverride)}
        </p>
      ) : null}
      {snapshot.note ? <p className="entry-note">{snapshot.note}</p> : null}
    </div>
  );
}
