drop view if exists public.public_chapter_snapshots;
drop function if exists public.publish_current_user_chapter(text, jsonb);
drop table if exists public.chapter_snapshots;
drop table if exists public.user_chapters cascade;

create table public.user_chapters (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  slug text not null unique,
  display_name text not null,
  owner_key text not null,
  app_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_chapters enable row level security;

create policy "Users can read own chapter"
on public.user_chapters
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own chapter"
on public.user_chapters
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own chapter"
on public.user_chapters
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table public.chapter_snapshots (
  slug text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

revoke all on public.chapter_snapshots from anon, authenticated;

create or replace function public.publish_current_user_chapter(
  input_slug text,
  input_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_slug text;
  published_at timestamptz := now();
begin
  if current_user_id is null then
    raise exception 'not_authenticated';
  end if;

  select slug
  into current_slug
  from public.user_chapters
  where user_id = current_user_id;

  if current_slug is null then
    raise exception 'chapter_not_initialized';
  end if;

  if current_slug <> input_slug then
    raise exception 'slug_mismatch';
  end if;

  insert into public.chapter_snapshots (slug, user_id, snapshot, updated_at)
  values (input_slug, current_user_id, input_snapshot, published_at)
  on conflict (slug) do update
    set snapshot = excluded.snapshot,
        updated_at = excluded.updated_at
  where public.chapter_snapshots.user_id = current_user_id;

  if not found then
    raise exception 'slug_not_owned';
  end if;

  return jsonb_build_object(
    'published_at', published_at
  );
end;
$$;

grant execute on function public.publish_current_user_chapter(text, jsonb) to authenticated;

create or replace view public.public_chapter_snapshots as
select slug, snapshot, updated_at
from public.chapter_snapshots;

grant select on public.public_chapter_snapshots to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('chapter-photos', 'chapter-photos', false)
on conflict (id) do update
set public = false;

drop policy if exists "Users can read own chapter photos" on storage.objects;
drop policy if exists "Users can upload own chapter photos" on storage.objects;
drop policy if exists "Users can update own chapter photos" on storage.objects;
drop policy if exists "Users can delete own chapter photos" on storage.objects;

create policy "Users can read own chapter photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chapter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload own chapter photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chapter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own chapter photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chapter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'chapter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own chapter photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chapter-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
