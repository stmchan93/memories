# Architecture

## Product shape

The app is deliberately narrow:

- `Calendar`: private daily logging
- `Wrapped`: recap plus showcase management entry point
- `Settings`: account, public link, sign out
- `/:username`: public read-only wrapped page

The private app is authoring-first. The public page is snapshot-first.

## Data model

There are three storage layers:

1. Browser cache
   - local app cache in `localStorage`
   - local image fallback in `IndexedDB`

2. Supabase Postgres
   - `user_chapters`: private per-user source of truth
   - `chapter_snapshots`: published public payloads keyed by slug
   - `public_chapter_snapshots`: read-only view for anonymous public pages

3. Supabase Storage
   - `chapter-photos` private bucket
   - user-scoped object paths under `{userId}/{date}/...`

## Auth model

The product UI is `username + password`.

Under the hood, Supabase Auth still uses email/password because that is its native browser flow. The app derives an internal email from the username and hides that implementation detail from the user.

`username === public slug`

That keeps the public URL simple:

- `/schan`

## Save flow

1. The client edits local React state.
2. The app writes a trimmed version of that state to `localStorage`.
3. A debounced cloud save writes the same chapter payload to `user_chapters`.

The cloud save is deduped on a serialized payload key so repeated equivalent state changes do not keep hitting Supabase.

## Public sharing flow

Public pages are not live reads from the private chapter row.

Instead:

1. The client derives a public-only snapshot from the current chapter.
2. The snapshot includes only:
   - public day entries
   - public showcase items
   - summary counts
3. The app publishes that payload through the `publish_current_user_chapter` RPC.
4. Anonymous visitors read from `public.public_chapter_snapshots`.

This keeps the public page read-only and isolates private draft data from the public route.

## Photo handling

### Private app

- A day can have one photo.
- Uploads go to the private `chapter-photos` bucket.
- The chapter data stores a storage reference, not a raw public URL.
- The app resolves that reference into a short-lived signed URL when it needs to render the image.

### Public page

- Public wrapped pages do not access the private bucket directly.
- During snapshot publish, explicitly public memories get long-lived signed photo URLs embedded into the snapshot.
- Private days never contribute photo URLs to the public snapshot.

This is the main security boundary for media.

## Google Calendar integration

Google Calendar is optional and read-only.

- OAuth happens in the browser with Google Identity Services
- scope: `calendar.readonly`
- the app syncs events for the visible month only
- synced events are cached into chapter state and displayed under the selected day

The app never creates, edits, or deletes calendar events.

## Important decisions

### Only today is editable

Past and future days are read-only on purpose. The app is meant to be written in real time, not backfilled.

### Public pages are snapshot-based

This avoids exposing private draft data or requiring a live public read of the private chapter row.

### Private bucket, not public bucket

The repo does not rely on a public photo bucket. Public media access is derived from explicit publish decisions.

### Minimal docs

The repo keeps only:

- `README.md`
- `ARCHITECTURE.md`
- `supabase/schema.sql`

Everything else is either runtime code or tests.
