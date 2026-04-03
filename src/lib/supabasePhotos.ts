import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';

const PHOTO_BUCKET = 'chapter-photos';
const PHOTO_REF_PREFIX = `supabase:${PHOTO_BUCKET}/`;

export const DEFAULT_SIGNED_URL_TTL = 60 * 60;
export const PUBLIC_SHARE_SIGNED_URL_TTL = 60 * 60 * 24 * 30;

const signedUrlCache = new Map<string, string>();

const createObjectId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not prepare that image.'));
          return;
        }

        resolve(blob);
      },
      type,
      quality,
    );
  });

const sanitizeExtension = (value: string | null | undefined) => {
  const trimmed = (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  return trimmed || null;
};

const extensionFromMimeType = (mimeType: string) => {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    case 'image/avif':
      return 'avif';
    case 'image/jpeg':
    case 'image/jpg':
    default:
      return 'jpg';
  }
};

const getFileExtension = (file: File) => {
  const fromName = sanitizeExtension(file.name.split('.').pop());

  if (fromName) {
    return fromName;
  }

  return extensionFromMimeType(file.type);
};

const resizeImageFile = (file: File) =>
  new Promise<Blob>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = async () => {
      try {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
          resolve(file);
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const blob = await canvasToBlob(canvas, type, type === 'image/jpeg' ? 0.82 : undefined);
        resolve(blob);
      } catch {
        resolve(file);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    image.src = objectUrl;
  });

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);

  if (!response.ok) {
    throw new Error('Could not prepare that image.');
  }

  return response.blob();
};

const buildPhotoPath = ({
  userId,
  date,
  extension,
}: {
  userId: string;
  date: string;
  extension: string;
}) => `${userId}/${date}/${createObjectId()}.${extension}`;

const buildPhotoReference = (path: string) => `${PHOTO_REF_PREFIX}${path}`;

const uploadPhotoBlob = async ({
  blob,
  userId,
  date,
  extension,
  contentType,
}: {
  blob: Blob;
  userId: string;
  date: string;
  extension?: string;
  contentType?: string;
}) => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase storage is not configured for this app.');
  }

  const supabase = getSupabaseClient();
  const normalizedExtension = sanitizeExtension(extension) ?? extensionFromMimeType(blob.type);
  const normalizedContentType = contentType?.trim() || blob.type || 'application/octet-stream';
  const path = buildPhotoPath({
    userId,
    date,
    extension: normalizedExtension,
  });

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, {
    cacheControl: '3600',
    contentType: normalizedContentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return buildPhotoReference(path);
};

const getPhotoPath = (value: string) => {
  if (value.startsWith(PHOTO_REF_PREFIX)) {
    return value.slice(PHOTO_REF_PREFIX.length);
  }

  try {
    const parsed = new URL(value);
    const markers = [
      `/storage/v1/object/public/${PHOTO_BUCKET}/`,
      `/storage/v1/render/image/public/${PHOTO_BUCKET}/`,
    ];

    for (const marker of markers) {
      const markerIndex = parsed.pathname.indexOf(marker);

      if (markerIndex >= 0) {
        return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
      }
    }

    return null;
  } catch {
    return null;
  }
};

export const isSupabasePhotoStorageConfigured = () => isSupabaseConfigured();

export const isSupabasePhotoUrl = (value: string) => Boolean(getPhotoPath(value));

export const normalizeStoredChapterPhoto = (value: string) => {
  const path = getPhotoPath(value);

  return path ? buildPhotoReference(path) : value;
};

export const resolveChapterPhotoUrl = async (
  value: string,
  expiresIn = DEFAULT_SIGNED_URL_TTL,
) => {
  if (!value) {
    return null;
  }

  if (value.startsWith('data:')) {
    return value;
  }

  if (/^https?:\/\//.test(value) && !value.includes(`/storage/v1/object/public/${PHOTO_BUCKET}/`)) {
    return value;
  }

  const path = getPhotoPath(value);

  if (!path) {
    return value;
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase storage is not configured for this app.');
  }

  const cacheKey = `${path}:${expiresIn}`;
  const cached = signedUrlCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Could not prepare that photo.');
  }

  signedUrlCache.set(cacheKey, data.signedUrl);
  return data.signedUrl;
};

export const resolveChapterPhotoUrls = async (
  values: string[],
  expiresIn = DEFAULT_SIGNED_URL_TTL,
) => Promise.all(values.map((value) => resolveChapterPhotoUrl(value, expiresIn)));

export const uploadChapterPhotoFile = async ({
  file,
  userId,
  date,
}: {
  file: File;
  userId: string;
  date: string;
}) => {
  const blob = await resizeImageFile(file);
  return uploadPhotoBlob({
    blob,
    userId,
    date,
    extension: getFileExtension(file),
    contentType: blob.type || file.type,
  });
};

export const uploadChapterPhotoDataUrl = async ({
  dataUrl,
  userId,
  date,
}: {
  dataUrl: string;
  userId: string;
  date: string;
}) => {
  const blob = await dataUrlToBlob(dataUrl);
  return uploadPhotoBlob({
    blob,
    userId,
    date,
  });
};

export const removeChapterPhotoByUrl = async (url: string) => {
  const path = getPhotoPath(url);

  if (!path) {
    return false;
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase storage is not configured for this app.');
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path]);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};
