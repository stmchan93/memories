import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

let didLoadEnvFile = false;

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

const chunk = <T,>(items: T[], size: number) => {
  const groups: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
};

const loadEnvFile = () => {
  if (didLoadEnvFile) {
    return;
  }

  didLoadEnvFile = true;
  const envPath = path.resolve(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, 'utf8');

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

const getAdminClient = () => {
  loadEnvFile();

  const url = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for e2e cleanup.');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const listAllStoragePaths = async (userId: string) => {
  const supabase = getAdminClient();
  const results: string[] = [];

  const visit = async (currentPrefix: string) => {
    const { data, error } = await supabase.storage.from('chapter-photos').list(currentPrefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`Could not list storage objects for ${userId}: ${error.message}`);
    }

    for (const item of data ?? []) {
      const nextPath = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;

      if (!item.id) {
        await visit(nextPath);
        continue;
      }

      results.push(nextPath);
    }
  };

  await visit(userId);

  return results;
};

export const cleanupUserBySlug = async (rawSlug: string) => {
  const slug = normalizeSlug(rawSlug);

  if (!slug) {
    return;
  }

  const supabase = getAdminClient();
  const { data: chapter, error: chapterError } = await supabase
    .from('user_chapters')
    .select('user_id, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (chapterError) {
    throw new Error(`Could not load ${slug} for cleanup: ${chapterError.message}`);
  }

  if (!chapter) {
    return;
  }

  const storagePaths = await listAllStoragePaths(chapter.user_id);

  for (const group of chunk(storagePaths, 100)) {
    const { error } = await supabase.storage.from('chapter-photos').remove(group);

    if (error) {
      throw new Error(`Could not delete photos for ${slug}: ${error.message}`);
    }
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(chapter.user_id);

  if (deleteAuthError) {
    throw new Error(`Could not delete ${slug}: ${deleteAuthError.message}`);
  }
};
