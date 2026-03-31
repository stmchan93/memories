import { Suspense, lazy } from 'react';
import {
  formatCurrency,
  formatDecimal,
  formatBurnRateLabel,
  formatIsoDate,
  formatRunwayLabel,
  getDaysUnemployed,
  getEstimatedMonthlyBurn,
  getLatestMoneySnapshot,
  getLatestWeeklyReview,
  getRunwayMonths,
  getSignalSummary,
  getTodayCheckin,
  getWeeksSinceLeaving,
} from '../lib/metrics';
import type { AppData, AppRoute } from '../types';

const LazyHomeCharts = lazy(async () => {
  const module = await import('./HomeCharts');

  return { default: module.HomeCharts };
});

type HomeRouteProps = {
  data: AppData;
  onNavigate: (route: AppRoute) => void;
};

export function HomeRoute({ data, onNavigate }: HomeRouteProps) {
  const profile = data.profile;
  const latestSnapshot = getLatestMoneySnapshot(data);

  if (!profile || !latestSnapshot) {
    return null;
  }

  const daysUnemployed = getDaysUnemployed(profile);
  const weeksSinceLeaving = getWeeksSinceLeaving(profile);
  const estimatedMonthlyBurn = getEstimatedMonthlyBurn(data.moneySnapshots);
  const runwayMonths = getRunwayMonths(latestSnapshot, estimatedMonthlyBurn);
  const signalSummary = getSignalSummary(data.dailyCheckins);
  const todayCheckin = getTodayCheckin(data.dailyCheckins);
  const latestWeeklyReview = getLatestWeeklyReview(data.weeklyReviews);
  const hasCheckins = data.dailyCheckins.length > 0;
  const hasReflectionData = Boolean(todayCheckin?.note || latestWeeklyReview);

  return (
    <div className="route-layout">
      <section className="feature-card counter-strip">
        <div className="counter-grid">
          <CounterMetric
            label="Days unemployed"
            value={`${daysUnemployed}`}
            detail="Days since this started"
          />
          <CounterMetric
            label="Weeks unemployed"
            value={`${weeksSinceLeaving}`}
            detail="The longer-view counter"
          />
          <CounterMetric
            label="Cash left"
            value={formatCurrency(latestSnapshot.liquidCash)}
            detail={`As of ${formatIsoDate(latestSnapshot.snapshotDate)}`}
          />
          <CounterMetric
            label="Runway left"
            value={formatRunwayLabel(runwayMonths)}
            detail={formatBurnRateLabel(estimatedMonthlyBurn)}
          />
        </div>
      </section>

      <Suspense fallback={<ChartLoadingState />}>
        <LazyHomeCharts data={data} />
      </Suspense>

      <article className="feature-card">
        <div className="card-header">
          <div>
            <p className="section-kicker">Weekly</p>
            <h2>Weekly reflection</h2>
          </div>
          <button className="link-button" type="button" onClick={() => onNavigate('weekly')}>
            Open weekly
          </button>
        </div>

        <div className="reflection-stack">
          <ReflectionRow label="Today's note" value={todayCheckin?.note || 'No daily note yet'} />
          <ReflectionRow
            label="This week's focus"
            value={latestWeeklyReview?.weeklyFocus || 'No weekly focus yet'}
          />
          <ReflectionRow
            label="Week summary"
            value={latestWeeklyReview?.weekSummary || 'No weekly summary yet'}
          />
          <ReflectionRow
            label="Mood trend"
            value={
              hasCheckins
                ? `${formatDecimal(signalSummary.mood7dAvg, 1)}/10 average mood lately`
                : 'No mood trend yet'
            }
          />
        </div>

        {!hasReflectionData ? (
          <EmptyState
            title="No reflection entries yet."
            body="Use the Weekly route to capture what gave energy, what got avoided, and what next week should actually focus on."
          />
        ) : null}
      </article>
    </div>
  );
}

function CounterMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="counter-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ReflectionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="reflection-row">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function ChartLoadingState() {
  return (
    <section className="chart-grid">
      <article className="feature-card chart-card chart-card-wide chart-loading-card">
        <div className="chart-copy">
          <p className="section-kicker">Charts</p>
          <h2>Loading dashboard charts</h2>
          <p className="body-copy">
            Pulling in the heavier chart bundle only when Home needs it.
          </p>
        </div>
      </article>
    </section>
  );
}
