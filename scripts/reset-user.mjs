import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const envPath = path.join(projectRoot, '.env.local');

const normalizeSlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

const loadEnvFile = () => {
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

const chunk = (items, size) => {
  const groups = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
};

const listAllStoragePaths = async (supabase, bucket, prefix) => {
  const results = [];

  const visit = async (currentPrefix) => {
    const { data, error } = await supabase.storage.from(bucket).list(currentPrefix, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      throw new Error(`Could not list storage objects under ${currentPrefix}: ${error.message}`);
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

  await visit(prefix);

  return results;
};

const main = async () => {
  loadEnvFile();

  const [, , rawUsername, confirmationFlag] = process.argv;
  const username = normalizeSlug(rawUsername ?? '');

  if (!username) {
    throw new Error('Usage: npm run reset:user -- <username> --yes');
  }

  if (confirmationFlag !== '--yes') {
    throw new Error('Add --yes to confirm deletion.');
  }

  const url = process.env.VITE_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local or the shell environment.',
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: chapter, error: chapterError } = await supabase
    .from('user_chapters')
    .select('user_id, slug')
    .eq('slug', username)
    .maybeSingle();

  if (chapterError) {
    throw new Error(`Could not load ${username}: ${chapterError.message}`);
  }

  if (!chapter) {
    console.log(`No user_chapters row found for ${username}. Nothing to delete.`);
    return;
  }

  const storagePaths = await listAllStoragePaths(supabase, 'chapter-photos', chapter.user_id);

  for (const group of chunk(storagePaths, 100)) {
    const { error } = await supabase.storage.from('chapter-photos').remove(group);

    if (error) {
      throw new Error(`Could not delete storage objects for ${username}: ${error.message}`);
    }
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(chapter.user_id);

  if (deleteAuthError) {
    throw new Error(`Could not delete auth user for ${username}: ${deleteAuthError.message}`);
  }

  console.log(
    `Deleted ${username}. Removed ${storagePaths.length} photo object${storagePaths.length === 1 ? '' : 's'}.`,
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
