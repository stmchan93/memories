import { useEffect, useState } from 'react';
import { DEFAULT_SIGNED_URL_TTL, resolveChapterPhotoUrl } from '../lib/supabasePhotos';

export const useResolvedPhotoUrl = (
  source: string | null,
  expiresIn = DEFAULT_SIGNED_URL_TTL,
) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!source) {
      setResolvedUrl(null);
      return () => {
        cancelled = true;
      };
    }

    void resolveChapterPhotoUrl(source, expiresIn)
      .then((nextUrl) => {
        if (!cancelled) {
          setResolvedUrl(nextUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedUrl(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [expiresIn, source]);

  return resolvedUrl;
};
