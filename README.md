# ThisChapter

ThisChapter is a small personal app for documenting a chapter of life day by day.

It centers on three things:

- a calendar where only `today` is editable
- a single daily note plus optional photo
- a public wrapped page at `/:username` with recent memories and showcase links

## Features

- Username/password auth with Supabase
- Day-by-day calendar logging
- One stored photo per day
- Wrapped recap with recent memories and showcase items
- Public read-only pages at `/:username`
- Optional read-only Google Calendar sync for the selected month

## Stack

- React + Vite + TypeScript
- Supabase Auth
- Supabase Postgres for private chapter data and public snapshots
- Supabase Storage for day photos
- Playwright for end-to-end regression coverage

## Local setup

1. Create a Supabase project.
2. In Supabase Auth:
   - enable the `Email` provider
   - set `Site URL` to `http://localhost:5173`
   - add redirect URLs:
     - `http://localhost:5173/`
     - your production URL if you have one
3. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql).
4. Create `.env.local` in the repo root:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_SERVICE_ROLE_KEY` is optional for the app itself. It is only used by the local cleanup script and the e2e admin helpers.

5. Install dependencies and start the app:

```bash
npm install
npm run dev
```

## Google Calendar setup

Google Calendar sync is optional.

1. Enable the Google Calendar API in Google Cloud.
2. Create a `Web application` OAuth client.
3. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - your production origin
4. Put the client ID in `VITE_GOOGLE_CLIENT_ID`.

The app only requests `calendar.readonly`.

## Production setup

- Put the same `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GOOGLE_CLIENT_ID` values into your hosting provider.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend runtime env vars.
- Set Supabase Auth `Site URL` and redirect URLs to your production URL.

## Testing

```bash
npm run build
npm run test:e2e
```

Reset a reserved local test account:

```bash
npm run reset:user -- test --yes
```

## Security notes

- The frontend only uses the Supabase anon key, which is expected for browser apps.
- The service role key is local-only and should never be exposed via `VITE_*` env vars.
- Day photos are stored in a private Supabase bucket.
- Public wrapped pages do not read directly from private storage. They render from a published snapshot, and public photos use signed URLs generated from explicitly public memories only.

## Repo surface

The repo intentionally keeps only public-facing docs:

- [`README.md`](./README.md)
- [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`supabase/schema.sql`](./supabase/schema.sql)
