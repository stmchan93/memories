type LegalPageProps = {
  kind: 'privacy' | 'terms';
};

const LAST_UPDATED = 'April 2, 2026';
const CONTACT_EMAIL = 'stmchan8953@gmail.com';

export function LegalPage({ kind }: LegalPageProps) {
  const isPrivacy = kind === 'privacy';

  return (
    <main className="app-shell dashboard-shell legal-shell">
      <header className="shell-header">
        <div>
          <p className="eyebrow">Runway</p>
          <h1>{isPrivacy ? 'Privacy policy' : 'Terms of service'}</h1>
          <p className="body-copy">Last updated {LAST_UPDATED}</p>
        </div>
      </header>

      <section className="feature-card legal-card">
        {isPrivacy ? <PrivacyContent /> : <TermsContent />}
      </section>
    </main>
  );
}

function PrivacyContent() {
  return (
    <div className="legal-copy">
      <p>
        Runway is a personal chapter-tracking app. This policy explains what information the app
        stores, how shared pages work, and how optional Google Calendar sync is handled.
      </p>

      <h2>What Runway stores</h2>
      <p>
        Runway may store your username, account identifier, daily entries, photos you upload,
        showcase items, and public chapter settings. Authenticated chapter data syncs to Supabase,
        and uploaded photos may be stored in Supabase Storage so your account and public page can
        work across sessions.
      </p>

      <h2>Google Calendar access</h2>
      <p>
        If you choose to connect Google Calendar, Runway requests read-only access to your calendar
        through the <code>calendar.readonly</code> scope. Runway uses that access only to display
        your calendar events inside the app. Runway does not create, edit, or delete Google
        Calendar events.
      </p>

      <h2>Public chapter pages</h2>
      <p>
        When you make a day or showcase item public, Runway publishes a read-only snapshot to your
        public chapter page at <code>/{'{username}'}</code>. Only content you mark public is meant
        to appear there.
      </p>

      <h2>How your data is used</h2>
      <p>
        Your data is used only to operate the app: saving your chapter, displaying your calendar
        and memories, and rendering your public page when you choose to share it. Runway does not
        sell personal data.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="legal-copy">
      <p>
        These terms govern your use of Runway, a lightweight chapter-tracking app for daily logs,
        memories, showcase links, and optional public sharing.
      </p>

      <h2>Use of the service</h2>
      <p>
        You may use Runway for personal, lawful purposes. You are responsible for the content you
        write, upload, and publish through your account.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of the content you add to Runway. By using the app, you allow Runway to
        store and display that content as needed to operate your private account and any public
        chapter page you choose to publish.
      </p>

      <h2>Public sharing</h2>
      <p>
        If you mark content public, it may appear on your public chapter page. You are responsible
        for deciding what is private and what is public.
      </p>

      <h2>Availability</h2>
      <p>
        Runway is provided on an as-is basis. The service may change, be updated, or be unavailable
        from time to time.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </div>
  );
}
