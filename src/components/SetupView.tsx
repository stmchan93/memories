import type { SetupInput } from '../types';

type SetupViewProps = {
  input: SetupInput;
  errors: Partial<Record<keyof SetupInput, string>>;
  onChange: (field: keyof SetupInput, value: string) => void;
  onLoadDemoData: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function SetupView({
  input,
  errors,
  onChange,
  onLoadDemoData,
  onSubmit,
}: SetupViewProps) {
  return (
    <main className="app-shell onboarding-shell">
      <section className="hero-card">
        <p className="eyebrow">Runway</p>
        <h1>Start with the few numbers that actually matter.</h1>
        <p className="hero-copy">
          The first version should feel grounding, not bureaucratic. Get the
          baseline in with start date and cash, then let the burn estimate
          appear once you have more than one cash checkpoint.
        </p>
        <div className="hero-points">
          <div>
            <span>01</span>
            <p>Mark when this chapter started.</p>
          </div>
          <div>
            <span>02</span>
            <p>Log the cash you actually have right now.</p>
          </div>
          <div>
            <span>03</span>
            <p>Add another cash checkpoint later to estimate the run rate.</p>
          </div>
        </div>
      </section>

      <section className="setup-card">
        <div className="section-header">
          <p className="section-kicker">Setup</p>
          <h2>Core setup</h2>
          <p>
            This stores locally in your browser for now. No auth, no integrations,
            just enough to make the dashboard useful every day.
          </p>
        </div>

        <form className="setup-form" onSubmit={onSubmit}>
          <div className="field-grid single-column-mobile">
            <Field
              label="Unemployment start date"
              hint="Used to calculate how many days you have been unemployed."
              error={errors.unemploymentStartDate}
            >
              <input
                type="date"
                value={input.unemploymentStartDate}
                onChange={(event) =>
                  onChange('unemploymentStartDate', event.target.value)
                }
              />
            </Field>

            <Field
              label="Liquid cash"
              hint="Cash you can actually use right now for runway."
              error={errors.liquidCash}
            >
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="32000"
                value={input.liquidCash}
                onChange={(event) => onChange('liquidCash', event.target.value)}
              />
            </Field>

          </div>

          <details className="optional-details">
            <summary>Optional planning fields and context</summary>
            <p className="details-copy">
              You do not need these to get value from Runway. Add them only if
              they help you think more clearly.
            </p>

            <div className="field-grid">
              <Field
                label="Cash floor"
                hint="The cash amount where things start to feel urgent."
                error={errors.panicThresholdCash}
              >
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="10000"
                  value={input.panicThresholdCash}
                  onChange={(event) => onChange('panicThresholdCash', event.target.value)}
                />
              </Field>

              <Field
                label="Decision checkpoint date"
                hint="A date to pause and decide whether to push harder on job search, keep experimenting, or change direction."
                error={errors.targetDecisionDate}
              >
                <input
                  type="date"
                  value={input.targetDecisionDate}
                  onChange={(event) => onChange('targetDecisionDate', event.target.value)}
                />
              </Field>

              <Field
                label="Date for this cash number"
                hint="Leave this as today unless the cash amount is from a different date."
                error={errors.snapshotDate}
              >
                <input
                  type="date"
                  value={input.snapshotDate}
                  onChange={(event) => onChange('snapshotDate', event.target.value)}
                />
              </Field>

            </div>

            <Field
              label="Note"
              hint="Anything you want to remember about these numbers."
              error={errors.note}
            >
              <textarea
                rows={4}
                placeholder="Savings plus checking. Last big credit-card payment already cleared."
                value={input.note}
                onChange={(event) => onChange('note', event.target.value)}
              />
            </Field>
          </details>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              Save setup and enter Runway
            </button>
            <button className="ghost-button" type="button" onClick={onLoadDemoData}>
              Try demo data
            </button>
          </div>
          <p className="form-note">
            Want to click around first? Load seeded sample data, then reset when
            you want to replace it with your own.
          </p>
        </form>
      </section>
    </main>
  );
}

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
};

function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
