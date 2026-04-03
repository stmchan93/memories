import type {
  AppData,
  PublicChapterSnapshot,
  PublishedMemory,
  PublishedProject,
} from '../types';
import {
  PUBLIC_SHARE_SIGNED_URL_TTL,
  resolveChapterPhotoUrls,
} from './supabasePhotos';

const PUBLIC_MEMORY_LIMIT = 6;

export const DEFAULT_PUBLIC_SUBTITLE =
  'A simple recap of the days, memories, and things from this chapter.';

export const normalizeShareSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

export const getPublicChapterUrl = (slug: string) => {
  if (typeof window === 'undefined') {
    return `/${slug}`;
  }

  return `${window.location.origin}/${slug}`;
};

const getPublicProjects = (data: AppData): PublishedProject[] =>
  [...data.projects]
    .filter((project) => project.shareVisibility === 'public')
    .sort((left, right) => (right.shippedAt ?? right.updatedAt).localeCompare(left.shippedAt ?? left.updatedAt))
    .map((project) => ({
      itemType: project.itemType,
      name: project.name,
      status: project.status,
      summary: project.summary,
      url: project.url,
      startedAt: project.startedAt,
      shippedAt: project.shippedAt,
    }));

const getLocalPreviewMemories = (data: AppData): PublishedMemory[] =>
  [...data.dailyCheckins]
    .filter(
      (entry) =>
        entry.shareVisibility === 'public' &&
        (entry.summary.trim() || entry.photoDataUrls.length > 0),
    )
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, PUBLIC_MEMORY_LIMIT)
    .map((entry) => ({
      date: entry.date,
      summary: entry.summary,
      photoDataUrls: entry.photoDataUrls,
    }));

const getPublicMemories = async (data: AppData): Promise<PublishedMemory[]> =>
  Promise.all(
    [...data.dailyCheckins]
      .filter(
        (entry) =>
          entry.shareVisibility === 'public' &&
          (entry.summary.trim() || entry.photoDataUrls.length > 0),
      )
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, PUBLIC_MEMORY_LIMIT)
      .map(async (entry): Promise<PublishedMemory> => {
        const resolvedPhotoUrls = await resolveChapterPhotoUrls(
          entry.photoDataUrls,
          PUBLIC_SHARE_SIGNED_URL_TTL,
        ).catch(() => []);
        const photoDataUrls: string[] = resolvedPhotoUrls.flatMap((photoUrl) =>
          photoUrl ? [photoUrl] : [],
        );

        return {
          date: entry.date,
          summary: entry.summary,
          photoDataUrls,
        };
      }),
  );

export const buildPublicChapterSnapshot = async (
  data: AppData,
  slug: string,
): Promise<PublicChapterSnapshot> => {
  const publicDays = data.dailyCheckins.filter((entry) => entry.shareVisibility === 'public');
  const publicProjects = getPublicProjects(data);
  const publicMemories = await getPublicMemories(data);

  return {
    slug,
    title: slug,
    subtitle: DEFAULT_PUBLIC_SUBTITLE,
    daysLogged: publicDays.length,
    photos: publicDays.reduce((total, entry) => total + entry.photoDataUrls.length, 0),
    projectsWorkedOn: publicProjects.length,
    projects: publicProjects,
    highlights: publicMemories,
    publishedAt: new Date().toISOString(),
  };
};

export const buildLocalPreviewChapterSnapshot = (
  data: AppData,
  slug: string,
): PublicChapterSnapshot => {
  const publicDays = data.dailyCheckins.filter((entry) => entry.shareVisibility === 'public');
  const publicProjects = getPublicProjects(data);

  return {
    slug,
    title: slug,
    subtitle: DEFAULT_PUBLIC_SUBTITLE,
    daysLogged: publicDays.length,
    photos: publicDays.reduce((total, entry) => total + entry.photoDataUrls.length, 0),
    projectsWorkedOn: publicProjects.length,
    projects: publicProjects,
    highlights: getLocalPreviewMemories(data),
    publishedAt: new Date().toISOString(),
  };
};
