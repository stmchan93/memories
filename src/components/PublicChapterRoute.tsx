import { useEffect, useState } from 'react';
import { fetchPublicChapter } from '../lib/supabaseSharing';
import { ShowcaseGrid } from './ProjectsRoute';
import { Counter, MemoryPreviewGrid } from './RecapRoute';
import type { Project, PublicChapterSnapshot } from '../types';

type PublicChapterRouteProps = {
  slug: string;
  fallbackSnapshot?: PublicChapterSnapshot | null;
};

export function PublicChapterRoute({ slug, fallbackSnapshot = null }: PublicChapterRouteProps) {
  const [snapshot, setSnapshot] = useState<PublicChapterSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const nextSnapshot = await fetchPublicChapter(slug);

        if (cancelled) {
          return;
        }

        if (!nextSnapshot) {
          if (fallbackSnapshot) {
            setSnapshot(fallbackSnapshot);
            setError(null);
          } else {
            setError('No public chapter exists at this link yet.');
            setSnapshot(null);
          }
          return;
        }

        setSnapshot(nextSnapshot);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        if (fallbackSnapshot) {
          setSnapshot(fallbackSnapshot);
          setError(null);
        } else {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load this public chapter right now.',
          );
          setSnapshot(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [fallbackSnapshot, slug]);

  const showcaseProjects: Project[] =
    snapshot?.projects.map((project, index) => ({
      id: `${project.name}-${index}`,
      itemType: project.itemType,
      name: project.name,
      status: project.status,
      summary: project.summary,
      url: project.url,
      notes: '',
      startedAt: project.startedAt,
      shippedAt: project.shippedAt,
      shareVisibility: 'public',
      createdAt: snapshot.publishedAt,
      updatedAt: snapshot.publishedAt,
    })) ?? [];

  if (isLoading) {
    return (
      <main className="app-shell dashboard-shell public-shell">
        <header className="shell-header">
          <div>
            <p className="eyebrow">Runway</p>
            <h1>Loading chapter...</h1>
          </div>
        </header>
      </main>
    );
  }

  if (error || !snapshot) {
    return (
      <main className="app-shell dashboard-shell public-shell">
        <header className="shell-header">
          <div>
            <p className="eyebrow">Runway</p>
            <h1>Public chapter unavailable</h1>
            <p className="body-copy">{error ?? 'This page is not ready yet.'}</p>
          </div>
        </header>
      </main>
    );
  }

  return (
    <main className="app-shell dashboard-shell public-shell">
      <header className="shell-header">
        <div>
          <p className="eyebrow">Runway</p>
          <h1>{`${snapshot.title}'s memories`}</h1>
          <p className="body-copy">{snapshot.subtitle}</p>
        </div>
      </header>

      <section className="route-frame">
        <div className="route-layout">
          <section className="feature-card weekly-goals-card">
            <div className="counter-grid">
              <Counter label="Days logged" value={`${snapshot.daysLogged}`} />
              <Counter label="Photos" value={`${snapshot.photos}`} />
              <Counter label="Projects worked on" value={`${snapshot.projectsWorkedOn}`} />
            </div>
          </section>

          <section className="feature-card">
            <div className="card-header">
              <div>
                <p className="section-kicker">Showcase</p>
                <h2>Projects, posts, videos, and links</h2>
              </div>
            </div>

            {showcaseProjects.length > 0 ? (
              <ShowcaseGrid projects={showcaseProjects} editable={false} />
            ) : (
              <div className="empty-state">
                <strong>No public showcase items yet.</strong>
                <p>This chapter has not published any projects or links yet.</p>
              </div>
            )}
          </section>

          <section className="feature-card spotlight">
            <div className="card-header">
              <div>
                <p className="section-kicker">Highlights</p>
                <h2>Recent memories</h2>
              </div>
            </div>

            {snapshot.highlights.length > 0 ? (
              <MemoryPreviewGrid
                entries={snapshot.highlights.map((entry, index) => ({
                  id: `${entry.date}-${index}`,
                  date: entry.date,
                  summary: entry.summary,
                  photoDataUrls: entry.photoDataUrls,
                }))}
              />
            ) : (
              <div className="empty-state">
                <strong>No public memories yet.</strong>
                <p>Public days with notes or photos will show up here.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
