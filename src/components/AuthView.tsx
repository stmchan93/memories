type AuthMode = 'login' | 'signup';

type AuthViewProps = {
  mode: AuthMode;
  username: string;
  password: string;
  isSubmitting: boolean;
  message: string | null;
  error: string | null;
  onSwitchMode: (mode: AuthMode) => void;
  onChangeUsername: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function AuthView({
  mode,
  username,
  password,
  isSubmitting,
  message,
  error,
  onSwitchMode,
  onChangeUsername,
  onChangePassword,
  onSubmit,
}: AuthViewProps) {
  const isSignup = mode === 'signup';

  return (
    <main className="app-shell onboarding-shell onboarding-shell-simple">
      <section className="hero-card">
        <p className="eyebrow">Runway</p>
        <h1>{isSignup ? 'Create your account.' : 'Log in to your chapter.'}</h1>
        <p className="hero-copy">
          {isSignup
            ? 'Pick one username and password. Your username becomes your public chapter link.'
            : 'Use the same username and password you chose when you created the account.'}
        </p>
      </section>

      <section className="setup-card">
        <div className="section-header">
          <p className="section-kicker">{isSignup ? 'Create account' : 'Log in'}</p>
          <h2>{isSignup ? 'Start this chapter properly' : 'Pick up where you left off'}</h2>
          <p>
            {isSignup
              ? 'Username becomes the public URL, so you only choose it once.'
              : 'One username, one password, same chapter.'}
          </p>
        </div>

        <form className="setup-form" onSubmit={onSubmit}>
          <Field
            label="Username"
            hint={isSignup ? 'This becomes your public chapter URL.' : undefined}
          >
            <input
              type="text"
              placeholder="schan"
              value={username}
              onChange={(event) => onChangeUsername(event.target.value)}
              autoComplete="username"
            />
          </Field>

          <Field label="Password" hint={isSignup ? 'Use at least 8 characters.' : undefined}>
            <input
              type="password"
              placeholder={isSignup ? 'Create a password' : 'Your password'}
              value={password}
              onChange={(event) => onChangePassword(event.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </Field>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isSignup
                  ? 'Creating account...'
                  : 'Logging in...'
                : isSignup
                  ? 'Create account'
                  : 'Log in'}
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => onSwitchMode(isSignup ? 'login' : 'signup')}
            >
              {isSignup ? 'Already have an account?' : 'Create a new account'}
            </button>
          </div>
        </form>

        {message ? <p className="save-banner">{message}</p> : null}
        {error ? <p className="field-error">{error}</p> : null}
      </section>
    </main>
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
