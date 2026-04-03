import type { PublicChapterSnapshot } from '../types';
import { getSupabaseClient, getSupabaseConfig, isSupabaseConfigured } from './supabaseClient';

export const isSupabaseSharingConfigured = () =>
  isSupabaseConfigured();

export const publishPublicChapter = async ({
  slug,
  snapshot,
}: {
  slug: string;
  snapshot: PublicChapterSnapshot;
}) => {
  if (!isSupabaseSharingConfigured()) {
    throw new Error('Supabase sharing is not configured for this app.');
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('publish_current_user_chapter', {
    input_slug: slug,
    input_snapshot: snapshot,
  });

  if (error) {
    throw new Error(error.message);
  }

  const payload = (data ?? null) as { published_at?: string } | null;

  return {
    publishedAt: payload?.published_at ?? new Date().toISOString(),
  };
};

export const fetchPublicChapter = async (slug: string) => {
  if (!isSupabaseSharingConfigured()) {
    throw new Error('Supabase sharing is not configured for this app.');
  }

  const { url, anonKey } = getSupabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/public_chapter_snapshots?slug=eq.${encodeURIComponent(
      slug,
    )}&select=snapshot&limit=1`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Could not load the public chapter (${response.status}).`);
  }

  const payload = (await response.json()) as Array<{ snapshot: PublicChapterSnapshot }>;

  return payload[0]?.snapshot ?? null;
};
