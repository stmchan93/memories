import { useState, type FormEvent, type ReactNode } from 'react';
import { todayDateInput } from '../lib/dates';
import { getRecentCareerEntries, formatIsoDate } from '../lib/metrics';
import type { AppData, CareerEntry, CareerEntryType } from '../types';

const entryTypes: Array<{ value: CareerEntryType; label: string }> = [
  { value: 'application', label: 'Application' },
  { value: 'interview', label: 'Interview' },
];

type CareerRouteProps = {
  data: AppData;
  onSave: (entry: Omit<CareerEntry, 'id' | 'createdAt'>) => void;
};

type CareerDraft = {
  date: string;
  type: CareerEntryType;
  quantity: string;
  company: string;
  roleTitle: string;
  energyAfterCall: string;
  alignedNote: string;
  misalignedNote: string;
  note: string;
};

const createInitialDraft = (date = todayDateInput()): CareerDraft => ({
  date,
  type: 'application',
  quantity: '1',
  company: '',
  roleTitle: '',
  energyAfterCall: '',
  alignedNote: '',
  misalignedNote: '',
  note: '',
});

const validateDraft = (draft: CareerDraft) => {
  const errors: Partial<Record<'date' | 'quantity' | 'company' | 'energyAfterCall', string>> = {};

  if (!draft.date) {
    errors.date = 'Required';
  }

  const quantity = Number.parseInt(draft.quantity, 10);

  if (
    draft.type === 'application' &&
    (!draft.quantity.trim() || Number.isNaN(quantity) || quantity < 1)
  ) {
    errors.quantity = 'Enter a whole number of 1 or more';
  }

  if (!draft.company.trim() && !(draft.type === 'application' && quantity > 1)) {
    errors.company = 'Required';
  }

  if (draft.energyAfterCall.trim()) {
    const value = Number.parseFloat(draft.energyAfterCall);

    if (Number.isNaN(value) || value < 1 || value > 10) {
      errors.energyAfterCall = 'Use a value from 1 to 10';
    }
  }

  return errors;
};

export function CareerRoute({ data, onSave }: CareerRouteProps) {
  const [draft, setDraft] = useState<CareerDraft>(() => createInitialDraft());
  const [errors, setErrors] = useState<
    Partial<Record<'date' | 'quantity' | 'company' | 'energyAfterCall', string>>
  >({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showOptionalContext, setShowOptionalContext] = useState(false);
  const visibleEntries = data.careerEntries.filter(
    (entry) => entry.type === 'application' || entry.type === 'interview',
  );
  const recentEntries = getRecentCareerEntries(visibleEntries, 8);
  const parsedQuantity = Number.parseInt(draft.quantity, 10);
  const applicationQuantity =
    draft.type === 'application' && !Number.isNaN(parsedQuantity) && parsedQuantity > 0
      ? parsedQuantity
      : 1;
  const isBulkApplication = draft.type === 'application' && applicationQuantity > 1;

  const handleChange = (field: keyof CareerDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    if (
      field === 'date' ||
      field === 'quantity' ||
      field === 'company' ||
      field === 'energyAfterCall'
    ) {
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
      date: draft.date,
      type: draft.type,
      quantity: draft.type === 'application' ? applicationQuantity : 1,
      company: draft.company.trim() || 'Application batch',
      roleTitle: draft.roleTitle.trim(),
      energyAfterCall: draft.energyAfterCall.trim()
        ? Number.parseFloat(draft.energyAfterCall)
        : null,
      alignedNote: draft.alignedNote.trim(),
      misalignedNote: draft.misalignedNote.trim(),
      note: draft.note.trim(),
    });

    setSaveMessage(
      draft.type === 'application'
        ? applicationQuantity > 1
          ? `Saved ${applicationQuantity} applications.`
          : `Saved application for ${draft.company.trim() || 'Application batch'}.`
        : `Saved interview for ${draft.company.trim()}.`,
    );
    setDraft(createInitialDraft(draft.date));
    setShowOptionalContext(false);
  };

  return (
    <div className="route-layout">
      <section className="feature-card home-hero">
        <div className="hero-copy-block">
          <p className="section-kicker">Career</p>
          <h2>Make the search feel intentional instead of vague.</h2>
          <p className="body-copy">
            Keep this grounded in the concrete things that matter most:
            applications, interviews, and the small notes that help you
            remember what was real.
          </p>
        </div>
      </section>

      <section className="daily-grid">
        <article className="feature-card">
          <div className="card-header">
            <div>
              <p className="section-kicker">Log entry</p>
              <h2>Add one career event</h2>
            </div>
          </div>

          {saveMessage ? <p className="save-banner">{saveMessage}</p> : null}

          <form className="daily-form" onSubmit={handleSubmit}>
            <p className="form-note">
              Fast version: date, type, and either a company or an application
              count. Add fit notes only when they are useful.
            </p>

            <div className="field-grid">
              <Field label="Date" error={errors.date}>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) => handleChange('date', event.target.value)}
                />
              </Field>

              <Field
                label="Entry type"
                hint="Use whatever best matches the thing you actually did."
              >
                <select
                  value={draft.type}
                  onChange={(event) =>
                    handleChange('type', event.target.value as CareerEntryType)
                  }
                >
                  {entryTypes.map((entryType) => (
                    <option key={entryType.value} value={entryType.value}>
                      {entryType.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {draft.type === 'application' ? (
              <Field
                label="How many applications?"
                hint="Use this when you want to log a batch instead of one company at a time."
                error={errors.quantity}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={draft.quantity}
                  onChange={(event) => handleChange('quantity', event.target.value)}
                />
              </Field>
            ) : null}

            <Field
              label={isBulkApplication ? 'Company or batch label' : 'Company'}
              hint={
                isBulkApplication
                  ? 'Optional for bulk application logging. Leave blank to save this as an application batch.'
                  : 'Required so the log stays concrete.'
              }
              error={errors.company}
            >
              <input
                type="text"
                placeholder={isBulkApplication ? 'Application batch' : 'Stripe'}
                value={draft.company}
                onChange={(event) => handleChange('company', event.target.value)}
              />
            </Field>

            <Field
              label="Short note"
              hint="Anything useful you want to remember later."
            >
              <textarea
                rows={4}
                placeholder="Warm intro from Alex. Worth following up next week."
                value={draft.note}
                onChange={(event) => handleChange('note', event.target.value)}
              />
            </Field>

            <details
              className="optional-details inline-details"
              open={showOptionalContext}
              onToggle={(event) => setShowOptionalContext(event.currentTarget.open)}
            >
              <summary>Optional fit notes and context</summary>
              <p className="details-copy">
                Use this when you want to capture what felt promising, what felt
                off, or how energizing the interaction was.
              </p>

              <div className="field-grid">
                <Field
                  label="Role title"
                >
                  <input
                    type="text"
                    placeholder="Product engineer"
                    value={draft.roleTitle}
                    onChange={(event) => handleChange('roleTitle', event.target.value)}
                  />
                </Field>

                <Field
                  label="Energy after this"
                  error={errors.energyAfterCall}
                >
                  <input
                    type="number"
                    inputMode="decimal"
                    min="1"
                    max="10"
                    step="1"
                    placeholder="7"
                    value={draft.energyAfterCall}
                    onChange={(event) => handleChange('energyAfterCall', event.target.value)}
                  />
                </Field>
              </div>

              <div className="field-grid">
                <Field
                  label="What felt like a fit?"
                >
                  <textarea
                    rows={4}
                    placeholder="Strong product sense. Clear problems. Good pace."
                    value={draft.alignedNote}
                    onChange={(event) => handleChange('alignedNote', event.target.value)}
                  />
                </Field>

                <Field
                  label="What felt off?"
                >
                  <textarea
                    rows={4}
                    placeholder="Too process-heavy. Role felt narrow."
                    value={draft.misalignedNote}
                    onChange={(event) => handleChange('misalignedNote', event.target.value)}
                  />
                </Field>
              </div>

            </details>

            <div className="form-actions">
              <button className="primary-button" type="submit">
                Save career entry
              </button>
            </div>
          </form>
        </article>

        <aside className="daily-side-column">
          <article className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">Recent</p>
                <h2>Latest career entries</h2>
              </div>
            </div>

            {recentEntries.length > 0 ? (
              <div className="entry-list">
                {recentEntries.map((entry) => (
                  <CareerEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>No career entries yet.</strong>
                <p>
                  Start with the smallest real thing: an application or an interview.
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

function CareerEntryRow({ entry }: { entry: CareerEntry }) {
  const entryTypeLabel = entryTypes.find((type) => type.value === entry.type)?.label ?? entry.type;

  return (
    <div className="entry-row">
      <div className="entry-row-header">
        <strong>{entry.company}</strong>
        <span>{formatIsoDate(entry.date)}</span>
      </div>
      <div className="entry-chip-row">
        <span className="entry-chip">{entryTypeLabel}</span>
        {entry.quantity > 1 ? <span className="entry-chip">{entry.quantity} total</span> : null}
        {entry.roleTitle ? <span className="entry-chip">{entry.roleTitle}</span> : null}
        {entry.energyAfterCall != null ? (
          <span className="entry-chip">Energy {entry.energyAfterCall}/10</span>
        ) : null}
      </div>
      {entry.alignedNote ? <p className="entry-note">Fit: {entry.alignedNote}</p> : null}
      {entry.misalignedNote ? (
        <p className="entry-note">Off: {entry.misalignedNote}</p>
      ) : null}
      {entry.note ? <p className="entry-note">{entry.note}</p> : null}
    </div>
  );
}
