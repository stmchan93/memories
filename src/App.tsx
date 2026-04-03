import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import './app.css';
import { AuthView } from './components/AuthView';
import { CalendarRoute } from './components/CalendarRoute';
import { LegalPage } from './components/LegalPage';
import { PublicChapterRoute } from './components/PublicChapterRoute';
import { ProjectsRoute } from './components/ProjectsRoute';
import { RecapRoute } from './components/RecapRoute';
import { SettingsRoute } from './components/SettingsRoute';
import {
  getCurrentSession,
  initializeCurrentUserChapter,
  isSupabaseAuthConfigured,
  loadCurrentUserChapter,
  saveCurrentUserChapter,
  signInWithPassword,
  signOutCurrentUser,
  signUpWithPassword,
  subscribeToAuthChanges,
} from './lib/supabaseAuth';
import {
  buildLocalPreviewChapterSnapshot,
  buildPublicChapterSnapshot,
  normalizeShareSlug,
} from './lib/sharing';
import { uploadChapterPhotoDataUrl } from './lib/supabasePhotos';
import { createEmptyAppData, createId, hydrateAppData, loadAppData, saveAppData } from './lib/storage';
import { isSupabaseSharingConfigured, publishPublicChapter } from './lib/supabaseSharing';
import type { AppData, AppRoute, DailyCheckin, Project, SyncedCalendarEvent } from './types';

const routes: Array<{ id: AppRoute; label: string }> = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'wrapped', label: 'Wrapped' },
  { id: 'settings', label: 'Settings' },
];

const allRoutes: AppRoute[] = ['calendar', 'projects', 'wrapped', 'settings'];

const isAppRoute = (value: string): value is AppRoute => allRoutes.includes(value as AppRoute);

const readRouteFromHash = (): AppRoute => {
  if (typeof window === 'undefined') {
    return 'calendar';
  }

  const hash = window.location.hash.replace('#', '');

  if (hash === 'recap') {
    return 'wrapped';
  }

  return isAppRoute(hash) ? hash : 'calendar';
};

const readPublicSlugFromPath = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');

  if (!path || path === 'privacy' || path === 'terms') {
    return null;
  }

  return path;
};

const readStaticPageFromPath = (): 'privacy' | 'terms' | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');

  if (path === 'privacy' || path === 'terms') {
    return path;
  }

  return null;
};

const isLocalPreviewHost = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
};

type AuthStage = 'loading' | 'signed-out' | 'ready';
type AuthMode = 'login' | 'signup';

const toTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);

  return Number.isNaN(parsed) ? 0 : parsed;
};

const getAppFreshnessTimestamp = (data: AppData) =>
  Math.max(
    toTimestamp(data.profile?.updatedAt),
    ...data.moneySnapshots.map((snapshot) => toTimestamp(snapshot.createdAt)),
    ...data.dailyCheckins.map((entry) => toTimestamp(entry.updatedAt || entry.createdAt)),
    ...data.careerEntries.map((entry) => toTimestamp(entry.createdAt)),
    ...data.weeklyReviews.map((entry) => toTimestamp(entry.createdAt)),
    ...data.projects.map((project) => toTimestamp(project.updatedAt || project.createdAt)),
    toTimestamp(data.googleCalendar.lastSyncedAt),
    toTimestamp(data.shareSettings.completedOnboardingAt),
  );

const preferFresherAppData = (localData: AppData, cloudData: AppData) => {
  const localSlug = localData.shareSettings.slug.trim();
  const cloudSlug = cloudData.shareSettings.slug.trim();

  if (!localSlug || !cloudSlug || localSlug !== cloudSlug) {
    return cloudData;
  }

  return getAppFreshnessTimestamp(localData) >= getAppFreshnessTimestamp(cloudData)
    ? localData
    : cloudData;
};

const buildCloudSaveKey = (data: AppData) => JSON.stringify(data);

const buildPublicShareKey = (data: AppData) =>
  JSON.stringify({
    slug: data.shareSettings.slug.trim(),
    days: data.dailyCheckins
      .filter(
        (entry) =>
          entry.shareVisibility === 'public' &&
          (entry.summary.trim() || entry.photoDataUrls.length > 0),
      )
      .map((entry) => ({
        date: entry.date,
        summary: entry.summary,
        photoDataUrls: entry.photoDataUrls,
      })),
    projects: data.projects
      .filter((project) => project.shareVisibility === 'public')
      .map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        summary: project.summary,
        url: project.url,
        startedAt: project.startedAt,
        shippedAt: project.shippedAt,
      })),
  });

function App() {
  const initialStaticPage = readStaticPageFromPath();
  const initialPublicSlug = readPublicSlugFromPath();
  const shouldUseLocalPreviewFallback = Boolean(initialPublicSlug && isLocalPreviewHost());
  const [data, setData] = useState<AppData>(() =>
    shouldUseLocalPreviewFallback ? loadAppData() : createEmptyAppData(),
  );
  const [route, setRoute] = useState<AppRoute>(() => readRouteFromHash());
  const [publicSlug, setPublicSlug] = useState<string | null>(initialPublicSlug);
  const [staticPage, setStaticPage] = useState<'privacy' | 'terms' | null>(initialStaticPage);
  const [session, setSession] = useState<Session | null>(null);
  const [authStage, setAuthStage] = useState<AuthStage>(() =>
    initialPublicSlug || initialStaticPage ? 'ready' : 'loading',
  );
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isStorageHydrated, setIsStorageHydrated] = useState(() => typeof window === 'undefined');
  const [shareSyncError, setShareSyncError] = useState<string | null>(null);
  const [authUiState, setAuthUiState] = useState<{
    isSubmitting: boolean;
    message: string | null;
    error: string | null;
  }>({
    isSubmitting: false,
    message: null,
    error: null,
  });
  const [passwordDraft, setPasswordDraft] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const isMigratingLegacyPhotosRef = useRef(false);
  const lastCloudSaveKeyRef = useRef<string | null>(null);
  const lastPublicShareKeyRef = useRef<string | null>(null);
  const isSharingConfigured = isSupabaseSharingConfigured();
  const isAuthConfigured = isSupabaseAuthConfigured();

  const cloudSaveKey = useMemo(() => buildCloudSaveKey(data), [data]);
  const publicShareKey = useMemo(() => buildPublicShareKey(data), [data]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      staticPage ||
      (publicSlug && !isLocalPreviewHost())
    ) {
      setIsStorageHydrated(true);
      return;
    }

    let cancelled = false;

    void hydrateAppData(loadAppData()).then((hydratedData) => {
      if (cancelled) {
        return;
      }

      setData(hydratedData);
      setIsStorageHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, [publicSlug, staticPage]);

  useEffect(() => {
    if (typeof window === 'undefined' || publicSlug || staticPage) {
      return undefined;
    }

    const syncRoute = () => {
      setRoute(readRouteFromHash());
      setPublicSlug(readPublicSlugFromPath());
      setStaticPage(readStaticPageFromPath());
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);

    return () => window.removeEventListener('hashchange', syncRoute);
  }, [publicSlug, staticPage]);

  useEffect(() => {
    if (publicSlug || staticPage) {
      return undefined;
    }

    if (!isAuthConfigured) {
      setAuthStage('signed-out');
      setAuthUiState({
        isSubmitting: false,
        message: null,
        error: 'Supabase auth is not configured for this app yet.',
      });
      return undefined;
    }

    let cancelled = false;

    void getCurrentSession()
      .then((nextSession) => {
        if (cancelled) {
          return;
        }

        setSession(nextSession);
        setAuthStage(nextSession?.user ? 'loading' : 'signed-out');
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setAuthStage('signed-out');
        setAuthUiState({
          isSubmitting: false,
          message: null,
          error: error instanceof Error ? error.message : 'Could not start auth.',
        });
      });

    const {
      data: { subscription },
    } = subscribeToAuthChanges((nextSession) => {
      if (cancelled) {
        return;
      }

      setSession(nextSession);
      setAuthStage(nextSession?.user ? 'loading' : 'signed-out');
      setAuthUiState((current) => ({
        ...current,
        isSubmitting: false,
        error: null,
      }));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isAuthConfigured, publicSlug, staticPage]);

  useEffect(() => {
    if (publicSlug || staticPage || !isAuthConfigured || !session?.user) {
      if (!publicSlug && !staticPage && !session?.user) {
        setData(createEmptyAppData());
      }

      return;
    }

    let cancelled = false;
    setAuthStage('loading');

    void loadCurrentUserChapter(session.user.id)
      .then((chapter) => {
        if (cancelled) {
          return;
        }

        if (!chapter) {
          setAuthStage('signed-out');
          setAuthMode('signup');
          setAuthUiState({
            isSubmitting: false,
            message: null,
            error: 'Your account exists, but the chapter was not initialized yet. Create it below.',
          });
          return;
        }

        setData((current) => {
          const nextData = preferFresherAppData(current, chapter.appData);
          lastCloudSaveKeyRef.current = buildCloudSaveKey(nextData);
          lastPublicShareKeyRef.current = buildPublicShareKey(nextData);
          return nextData;
        });
        setUsernameDraft(chapter.slug);
        setAuthStage('ready');
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setAuthStage('signed-out');
        setAuthUiState({
          isSubmitting: false,
          message: null,
          error: error instanceof Error ? error.message : 'Could not load your chapter.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthConfigured, publicSlug, session?.user, staticPage]);

  useEffect(() => {
    if (!isStorageHydrated || publicSlug || staticPage || authStage !== 'ready') {
      return;
    }

    void saveAppData(data);
  }, [authStage, data, isStorageHydrated, publicSlug, staticPage]);

  useEffect(() => {
    if (
      !isStorageHydrated ||
      publicSlug ||
      staticPage ||
      authStage !== 'ready' ||
      !session?.user ||
      !session.user.email
    ) {
      return undefined;
    }

    if (lastCloudSaveKeyRef.current === cloudSaveKey) {
      return undefined;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void saveCurrentUserChapter({
        userId: session.user.id,
        email: session.user.email ?? '',
        slug: data.shareSettings.slug,
        ownerKey: data.shareSettings.ownerKey,
        data,
      })
        .then(() => {
          if (cancelled) {
            return;
          }

          lastCloudSaveKeyRef.current = cloudSaveKey;
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setShareSyncError(
            error instanceof Error ? error.message : 'Could not save your chapter.',
          );
        });
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [authStage, cloudSaveKey, data, isStorageHydrated, publicSlug, session?.user, staticPage]);

  useEffect(() => {
    if (
      !isStorageHydrated ||
      publicSlug ||
      staticPage ||
      !isSharingConfigured ||
      authStage !== 'ready' ||
      !session?.user
    ) {
      return undefined;
    }

    const slug = data.shareSettings.slug.trim();

    if (!slug) {
      setShareSyncError(null);
      return undefined;
    }

    if (lastPublicShareKeyRef.current === publicShareKey) {
      return undefined;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void (async () => {
        setShareSyncError(null);

        try {
          const snapshot = await buildPublicChapterSnapshot(data, slug);
          await publishPublicChapter({
            slug,
            snapshot,
          });

          if (cancelled) {
            return;
          }

          lastPublicShareKeyRef.current = publicShareKey;
        } catch (error) {
          if (cancelled) {
            return;
          }

          setShareSyncError(
            error instanceof Error
              ? error.message
              : 'Could not sync the public page right now.',
          );
        }
      })();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [
    authStage,
    data,
    isSharingConfigured,
    isStorageHydrated,
    publicSlug,
    publicShareKey,
    session?.user,
    staticPage,
  ]);

  useEffect(() => {
    if (
      publicSlug ||
      staticPage ||
      authStage !== 'ready' ||
      !session?.user ||
      isMigratingLegacyPhotosRef.current
    ) {
      return;
    }

    const entriesWithLocalPhotos = data.dailyCheckins.filter((entry) =>
      entry.photoDataUrls.some((photoDataUrl) => photoDataUrl.startsWith('data:')),
    );

    if (entriesWithLocalPhotos.length === 0) {
      return;
    }

    let cancelled = false;
    isMigratingLegacyPhotosRef.current = true;

    void (async () => {
      try {
        const migratedEntries = await Promise.all(
          entriesWithLocalPhotos.map(async (entry) => ({
            id: entry.id,
            photoDataUrls: await Promise.all(
              entry.photoDataUrls.map((photoDataUrl) =>
                photoDataUrl.startsWith('data:')
                  ? uploadChapterPhotoDataUrl({
                      dataUrl: photoDataUrl,
                      userId: session.user.id,
                      date: entry.date,
                    })
                  : Promise.resolve(photoDataUrl),
              ),
            ),
          })),
        );

        if (cancelled) {
          return;
        }

        const migratedMap = new Map(
          migratedEntries.map((entry) => [entry.id, entry.photoDataUrls]),
        );

        setData((current) => ({
          ...current,
          dailyCheckins: current.dailyCheckins.map((entry) =>
            migratedMap.has(entry.id)
              ? {
                  ...entry,
                  photoDataUrls: migratedMap.get(entry.id) ?? entry.photoDataUrls,
                }
              : entry,
          ),
        }));
      } catch (error) {
        if (!cancelled) {
          console.error('Could not migrate local photos to Supabase storage.', error);
        }
      } finally {
        if (!cancelled) {
          isMigratingLegacyPhotosRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStage, data.dailyCheckins, publicSlug, session?.user, staticPage]);

  const navigate = (nextRoute: AppRoute) => {
    if (typeof window === 'undefined') {
      setRoute(nextRoute);
      return;
    }

    const nextHash = `#${nextRoute}`;

    if (window.location.hash === nextHash) {
      setRoute(nextRoute);
      return;
    }

    window.location.hash = nextHash;
  };

  const handleSaveDayEntry = (
    nextEntry: Omit<DailyCheckin, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    const now = new Date().toISOString();

    setData((current) => {
      const existing = current.dailyCheckins.find((entry) => entry.date === nextEntry.date);

      const savedEntry: DailyCheckin = existing
        ? {
            ...existing,
            ...nextEntry,
            updatedAt: now,
          }
        : {
            ...nextEntry,
            id: createId(),
            createdAt: now,
            updatedAt: now,
          };

      const otherEntries = current.dailyCheckins.filter((entry) => entry.date !== nextEntry.date);

      return {
        ...current,
        dailyCheckins: [...otherEntries, savedEntry].sort((a, b) =>
          b.date.localeCompare(a.date),
        ),
      };
    });
  };

  const handleSaveProject = (
    nextProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => {
    const now = new Date().toISOString();

    setData((current) => {
      const existing = nextProject.id
        ? current.projects.find((project) => project.id === nextProject.id)
        : null;

      const savedProject: Project = existing
        ? {
            ...existing,
            ...nextProject,
            id: existing.id,
            updatedAt: now,
          }
        : {
            ...nextProject,
            id: createId(),
            createdAt: now,
            updatedAt: now,
          };

      const otherProjects = current.projects.filter((project) => project.id !== savedProject.id);

      return {
        ...current,
        projects: [savedProject, ...otherProjects].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt),
        ),
      };
    });
  };

  const handleSaveGoogleCalendarSync = ({
    syncedMonth,
    events,
  }: {
    syncedMonth: string;
    events: SyncedCalendarEvent[];
  }) => {
    setData((current) => ({
      ...current,
      googleCalendar: {
        isConnected: true,
        lastSyncedAt: new Date().toISOString(),
        syncedMonth,
        events,
      },
    }));
  };

  const resetAuthUiState = () =>
    setAuthUiState({
      isSubmitting: false,
      message: null,
      error: null,
    });

  const handleSubmitAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setAuthUiState({
      isSubmitting: true,
      message: null,
      error: null,
    });

    try {
      if (authMode === 'signup') {
        if (passwordDraft.length < 8) {
          throw new Error('Use a password with at least 8 characters.');
        }

        const normalizedUsername = normalizeShareSlug(usernameDraft);

        if (!normalizedUsername) {
          throw new Error('Choose a username to continue.');
        }

        const nextSession = await signUpWithPassword({
          password: passwordDraft,
          username: usernameDraft,
        });

        const sessionUser = nextSession?.user;

        if (!sessionUser?.id || !sessionUser.email) {
          throw new Error('Could not finish signup. Try logging in once your account is created.');
        }

        const chapter = await initializeCurrentUserChapter({
          userId: sessionUser.id,
          email: sessionUser.email,
          username: normalizedUsername,
          initialData: {
            ...data,
            shareSettings: {
            ...data.shareSettings,
            ownerKey: data.shareSettings.ownerKey || createId(),
          },
          },
        });

        setSession(nextSession);
        setData(chapter.appData);
        lastCloudSaveKeyRef.current = buildCloudSaveKey(chapter.appData);
        lastPublicShareKeyRef.current = buildPublicShareKey(chapter.appData);
        setAuthStage('ready');
        setUsernameDraft(chapter.slug);
        setAuthUiState({
          isSubmitting: false,
          message: null,
          error: null,
        });
        return;
      }

      const nextSession = await signInWithPassword({
        password: passwordDraft,
        username: usernameDraft,
      });

      setSession(nextSession);
      setAuthStage('loading');
      resetAuthUiState();
    } catch (error) {
      setAuthUiState({
        isSubmitting: false,
        message: null,
        error: error instanceof Error ? error.message : 'Could not authenticate right now.',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutCurrentUser();
      lastCloudSaveKeyRef.current = null;
      lastPublicShareKeyRef.current = null;
      setData(createEmptyAppData());
      setPasswordDraft('');
      setUsernameDraft('');
      setAuthMode('login');
      resetAuthUiState();
    } catch (error) {
      setAuthUiState({
        isSubmitting: false,
        message: null,
        error: error instanceof Error ? error.message : 'Could not sign out right now.',
      });
    }
  };

  if (publicSlug) {
    const fallbackSnapshot =
      isLocalPreviewHost() && (data.dailyCheckins.length > 0 || data.projects.length > 0)
        ? buildLocalPreviewChapterSnapshot(data, publicSlug)
        : null;

    return <PublicChapterRoute slug={publicSlug} fallbackSnapshot={fallbackSnapshot} />;
  }

  if (staticPage) {
    return <LegalPage kind={staticPage} />;
  }

  if (!isAuthConfigured) {
    return (
      <AuthView
        mode={authMode}
        password={passwordDraft}
        username={usernameDraft}
        isSubmitting={false}
        message={null}
        error="Supabase auth is not configured for this app yet."
        onSwitchMode={setAuthMode}
        onChangePassword={setPasswordDraft}
        onChangeUsername={(value) => setUsernameDraft(normalizeShareSlug(value))}
        onSubmit={handleSubmitAuth}
      />
    );
  }

  if (authStage === 'loading') {
    return (
      <main className="app-shell onboarding-shell onboarding-shell-simple">
        <section className="hero-card">
          <p className="eyebrow">Runway</p>
          <h1>Loading your chapter.</h1>
          <p className="hero-copy">Pulling your calendar, memories, and wrapped back into place.</p>
        </section>
      </main>
    );
  }

  if (authStage === 'signed-out') {
    return (
      <AuthView
        mode={authMode}
        password={passwordDraft}
        username={usernameDraft}
        isSubmitting={authUiState.isSubmitting}
        message={authUiState.message}
        error={authUiState.error}
        onSwitchMode={(mode) => {
          setAuthMode(mode);
          setAuthUiState((current) => ({ ...current, error: null, message: null }));
        }}
        onChangePassword={setPasswordDraft}
        onChangeUsername={(value) => setUsernameDraft(normalizeShareSlug(value))}
        onSubmit={handleSubmitAuth}
      />
    );
  }

  return (
    <main
      className={
        route === 'calendar'
          ? 'app-shell dashboard-shell calendar-shell'
          : 'app-shell dashboard-shell'
      }
    >
      <header className="shell-header">
        <div>
          <p className="eyebrow">Runway</p>
          <h1>
            {data.shareSettings.slug?.trim()
              ? `${data.shareSettings.slug}'s chapter in life`
              : 'Your chapter in life'}
          </h1>
        </div>
      </header>

      <nav className="route-nav" aria-label="Primary">
        {routes.map((navRoute) => (
          <button
            key={navRoute.id}
            className={
              [
                'route-chip',
                navRoute.id === route ? 'active' : '',
                navRoute.id === 'settings' ? 'route-chip-utility' : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
            type="button"
            onClick={() => navigate(navRoute.id)}
          >
            <span>{navRoute.label}</span>
          </button>
        ))}
      </nav>

      <section className="route-frame">
        {route === 'calendar' ? (
          <CalendarRoute
            data={data}
            photoStorageUserId={session?.user?.id ?? null}
            onSave={handleSaveDayEntry}
            onSaveGoogleCalendarSync={handleSaveGoogleCalendarSync}
          />
        ) : route === 'projects' ? (
          <ProjectsRoute data={data} onSave={handleSaveProject} />
        ) : route === 'settings' ? (
          <SettingsRoute
            shareSettings={data.shareSettings}
            onSignOut={() => void handleSignOut()}
            shareSyncError={shareSyncError}
            isSharingConfigured={isSharingConfigured}
          />
        ) : route === 'wrapped' ? (
          <RecapRoute
            data={data}
            onManageShowcase={() => navigate('projects')}
            shareSyncError={shareSyncError}
            isSharingConfigured={isSharingConfigured}
          />
        ) : (
          <SettingsRoute
            shareSettings={data.shareSettings}
            onSignOut={() => void handleSignOut()}
            shareSyncError={shareSyncError}
            isSharingConfigured={isSharingConfigured}
          />
        )}
      </section>
    </main>
  );
}

export default App;
