import type { Session } from '@supabase/supabase-js';
import type { AppData } from '../types';
import { normalizeShareSlug } from './sharing';
import { coerceAppData, createId } from './storage';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

type UserChapterRow = {
  user_id: string;
  email: string;
  slug: string;
  display_name: string;
  owner_key: string;
  app_data: AppData | null;
  updated_at: string;
  created_at: string;
};

const mapUserChapterRow = (row: UserChapterRow) => {
  const appData = coerceAppData(row.app_data);

  return {
    appData: {
      ...appData,
      shareSettings: {
        ...appData.shareSettings,
        slug: row.slug,
        ownerKey: row.owner_key || appData.shareSettings.ownerKey,
        completedOnboardingAt:
          appData.shareSettings.completedOnboardingAt ?? row.created_at ?? new Date().toISOString(),
      },
    },
    slug: row.slug,
    ownerKey: row.owner_key,
    updatedAt: row.updated_at,
  };
};

const isLocalPhotoDataUrl = (value: string) => value.startsWith('data:');

const serializeAppDataForCloud = ({
  data,
  slug,
  ownerKey,
}: {
  data: AppData;
  slug: string;
  ownerKey: string;
}) => ({
  ...data,
  dailyCheckins: data.dailyCheckins.map((checkin) => ({
    ...checkin,
    photoDataUrls: checkin.photoDataUrls.filter((photoDataUrl) => !isLocalPhotoDataUrl(photoDataUrl)),
  })),
  shareSettings: {
    ...data.shareSettings,
    slug,
    ownerKey,
    completedOnboardingAt:
      data.shareSettings.completedOnboardingAt ?? new Date().toISOString(),
  },
});

const mapSupabaseError = (message: string | null | undefined, fallback: string) => {
  const normalized = message?.toLowerCase() ?? '';

  if (normalized.includes('duplicate key') || normalized.includes('user_chapters_slug_key')) {
    return 'That username is already taken.';
  }

  return message || fallback;
};

const usernameToInternalEmail = (username: string) => {
  const normalizedUsername = normalizeShareSlug(username);

  if (!normalizedUsername) {
    throw new Error('Choose a username to continue.');
  }

  return `${normalizedUsername}@users.runway.local`;
};

export const isSupabaseAuthConfigured = () => isSupabaseConfigured();

export const getCurrentSession = async () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
};

export const subscribeToAuthChanges = (callback: (session: Session | null) => void) => {
  const supabase = getSupabaseClient();

  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};

export const signUpWithPassword = async ({
  username,
  password,
}: {
  username: string;
  password: string;
}) => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signUp({
    email: usernameToInternalEmail(username),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.session ?? null;
};

export const signInWithPassword = async ({
  username,
  password,
}: {
  username: string;
  password: string;
}) => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToInternalEmail(username),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.session ?? null;
};

export const signOutCurrentUser = async () => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
};

export const loadCurrentUserChapter = async (userId: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_chapters')
    .select('user_id, email, slug, display_name, owner_key, app_data, updated_at, created_at')
    .eq('user_id', userId)
    .maybeSingle<UserChapterRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapUserChapterRow(data);
};

export const initializeCurrentUserChapter = async ({
  userId,
  email,
  username,
  initialData,
}: {
  userId: string;
  email: string;
  username: string;
  initialData: AppData;
}) => {
  const slug = normalizeShareSlug(username);

  if (!slug) {
    throw new Error('Choose a username to continue.');
  }

  const ownerKey = initialData.shareSettings.ownerKey || createId();
  const serializedData = serializeAppDataForCloud({
    data: initialData,
    slug,
    ownerKey,
  });

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('user_chapters')
    .insert({
      user_id: userId,
      email,
      slug,
      display_name: slug,
      owner_key: ownerKey,
      app_data: serializedData,
    })
    .select('user_id, email, slug, display_name, owner_key, app_data, updated_at, created_at')
    .single<UserChapterRow>();

  if (error) {
    throw new Error(mapSupabaseError(error.message, 'Could not create your chapter yet.'));
  }

  return mapUserChapterRow(data);
};

export const saveCurrentUserChapter = async ({
  userId,
  email,
  slug,
  ownerKey,
  data,
}: {
  userId: string;
  email: string;
  slug: string;
  ownerKey: string;
  data: AppData;
}) => {
  const supabase = getSupabaseClient();
  const serializedData = serializeAppDataForCloud({
    data,
    slug,
    ownerKey,
  });

  const { error } = await supabase
    .from('user_chapters')
    .upsert(
      {
        user_id: userId,
        email,
        slug,
        display_name: slug,
        owner_key: ownerKey,
        app_data: serializedData,
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    throw new Error(mapSupabaseError(error.message, 'Could not save your chapter.'));
  }
};
