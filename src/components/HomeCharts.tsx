import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatBurnRateLabel,
  formatCurrency,
  formatCurrencyCompact,
  formatIsoDate,
  formatRunwayLabel,
  formatShortDateLabel,
  getDailyHistorySeries,
  getEstimatedMonthlyBurn,
  getLatestMoneySnapshot,
  getMoneyHistorySeries,
  getRunwayMonths,
} from '../lib/metrics';
import type { AppData } from '../types';

const chartPalette = {
  grid: 'rgba(39, 49, 47, 0.08)',
  axis: '#5c6965',
  cash: '#99572d',
  projected: '#d17843',
  floor: '#a1392f',
  decision: '#567b7b',
  build: '#567b7b',
  search: '#99572d',
};

const tooltipStyle = {
  backgroundColor: 'rgba(255, 252, 247, 0.96)',
  border: '1px solid rgba(39, 49, 47, 0.12)',
  borderRadius: '16px',
  boxShadow: '0 16px 40px rgba(77, 60, 33, 0.14)',
};

const formatSignedCurrency = (value: number | null) => {
  if (value === null) {
    return 'N/A';
  }

  if (value === 0) {
    return '$0';
  }

  const magnitude = formatCurrency(Math.abs(value));

  return value > 0 ? `+${magnitude}` : `-${magnitude}`;
};

export function HomeCharts({ data }: { data: AppData }) {
  const moneySeries = getMoneyHistorySeries(data);
  const dailySeries = getDailyHistorySeries(data.dailyCheckins, 14);
  const latestSnapshot = getLatestMoneySnapshot(data);
  const cashFloor = data.profile?.panicThresholdCash ?? null;
  const decisionDate = data.profile?.targetDecisionDate ?? null;
  const decisionDateInSeries =
    decisionDate != null && moneySeries.some((point) => point.date === decisionDate);
  const estimatedMonthlyBurn = getEstimatedMonthlyBurn(data.moneySnapshots);
  const runwayMonths = getRunwayMonths(latestSnapshot, estimatedMonthlyBurn);
  const cashBuffer =
    latestSnapshot && cashFloor != null ? latestSnapshot.liquidCash - cashFloor : null;
  const hasDailyData = data.dailyCheckins.length > 0;

  return (
    <section className="chart-grid">
      <article className="feature-card chart-card chart-card-wide">
        <div className="chart-copy">
          <p className="section-kicker">Momentum</p>
          <h2>Daily time spent</h2>
          <p className="body-copy">
            A simple week-by-week scoreboard for whether time is actually going where
            you want it to go.
          </p>
        </div>

        {hasDailyData ? (
          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={chartPalette.axis} tickLine={false} axisLine={false} />
                <YAxis stroke={chartPalette.axis} tickLine={false} axisLine={false} width={52} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => {
                    const point = payload?.[0]?.payload as { date?: string } | undefined;
                    return point?.date ? formatIsoDate(point.date) : '';
                  }}
                  formatter={(value, name) => [
                    `${value}h`,
                    name === 'hoursBuilding' ? 'Build time' : 'Job search time',
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === 'hoursBuilding' ? 'Build time' : 'Job search time'
                  }
                />
                <Bar dataKey="hoursBuilding" fill={chartPalette.build} radius={[6, 6, 0, 0]} />
                <Bar dataKey="hoursJobSearching" fill={chartPalette.search} radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="empty-state">
            <strong>No momentum chart yet.</strong>
            <p>Once you save a few daily check-ins, this chart will show how time has been going.</p>
          </div>
        )}
      </article>

      <article className="feature-card chart-card chart-card-wide">
        <div className="chart-copy">
          <p className="section-kicker">Remaining cash</p>
          <h2>Cash over time</h2>
          <p className="body-copy">
            Saved cash checkpoints over time, with the cash floor in view so you can see
            how much buffer is left before things start to feel tight.
          </p>
        </div>

        <div className="chart-metric-row">
          <MetricTile
            label="Current cash"
            value={latestSnapshot ? formatCurrency(latestSnapshot.liquidCash) : 'N/A'}
          />
          <MetricTile
            label="Estimated burn"
            value={formatBurnRateLabel(estimatedMonthlyBurn)}
          />
          <MetricTile
            label="Above cash floor"
            value={cashBuffer == null ? 'No cash floor set' : formatSignedCurrency(cashBuffer)}
          />
          <MetricTile
            label="Runway left"
            value={formatRunwayLabel(runwayMonths)}
          />
        </div>

        <div className="chart-frame">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={moneySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartPalette.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                stroke={chartPalette.axis}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatShortDateLabel(String(value))}
              />
              <YAxis
                stroke={chartPalette.axis}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrencyCompact(value)}
                width={72}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => {
                  if (typeof value !== 'number') {
                    return [value, name];
                  }

                  if (name === 'liquidCash' || name === 'projectedCash') {
                    return [
                      formatCurrency(value),
                      name === 'liquidCash' ? 'Saved cash' : 'Projected path',
                    ];
                  }

                  return [value, name];
                }}
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload as { date?: string } | undefined;
                  return point?.date ? formatIsoDate(point.date) : '';
                }}
              />
              <Legend
                formatter={(value) =>
                  value === 'liquidCash'
                    ? 'Saved cash'
                    : value === 'projectedCash'
                      ? 'Projected path'
                      : value
                }
              />
              {cashFloor != null ? (
                <ReferenceLine
                  y={cashFloor}
                  stroke={chartPalette.floor}
                  strokeDasharray="5 5"
                />
              ) : null}
              {decisionDateInSeries ? (
                <ReferenceLine
                  x={decisionDate ?? undefined}
                  stroke={chartPalette.decision}
                  strokeDasharray="5 5"
                  label={{
                    value: 'Decision date',
                    position: 'insideTopRight',
                    fill: chartPalette.decision,
                    fontSize: 12,
                  }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="liquidCash"
                name="liquidCash"
                stroke={chartPalette.cash}
                fill={chartPalette.cash}
                fillOpacity={0.16}
                strokeWidth={3}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="projectedCash"
                name="projectedCash"
                stroke={chartPalette.projected}
                strokeWidth={3}
                strokeDasharray="6 6"
                dot={{ r: 3 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <p className="chart-note">
          Solid area = saved checkpoints. Dashed line = projected path from the current
          estimated burn rate. Horizontal line = cash floor. Vertical line = decision
          date, when set.
        </p>
      </article>
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
