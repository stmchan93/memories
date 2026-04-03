import { useEffect, useState } from 'react';
import { getPublicChapterUrl } from '../lib/sharing';
import type { ShareSettings } from '../types';

type SettingsRouteProps = {
  shareSettings: ShareSettings;
  onSignOut: () => void;
  shareSyncError: string | null;
  isSharingConfigured: boolean;
};

export function SettingsRoute({
  shareSettings,
  onSignOut,
  shareSyncError,
  isSharingConfigured,
}: SettingsRouteProps) {
  const [message, setMessage] = useState<string | null>(null);
  const publicUrl = shareSettings.slug ? getPublicChapterUrl(shareSettings.slug) : null;

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [message]);

  const handleCopyLink = async () => {
    if (!publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage('Public link copied');
    } catch {
      setMessage('Could not copy the public link');
    }
  };

  return (
    <div className="route-layout">
      <section className="feature-card">
        <div className="card-header">
          <div>
            <p className="section-kicker">Settings</p>
            <h2>Your wrapped link</h2>
            <p className="body-copy">
              Share the things you've accomplished by copying the public link and sharing it
              publicly.
            </p>
          </div>
        </div>

        <div className="daily-form">
          <Field label="Username">
            <input type="text" value={shareSettings.slug} readOnly disabled />
          </Field>

          {publicUrl ? <p className="form-note">{publicUrl}</p> : null}

          <div className="form-actions">
            {publicUrl ? (
              <button className="ghost-button" type="button" onClick={handleCopyLink}>
                Copy public link
              </button>
            ) : null}
            <button className="ghost-button" type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>

          {!isSharingConfigured ? (
            <p className="field-hint">
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable public sharing.
            </p>
          ) : null}
          {shareSyncError ? <p className="field-error">{shareSyncError}</p> : null}
        </div>
      </section>

      {message ? (
        <div className="save-toast" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}
