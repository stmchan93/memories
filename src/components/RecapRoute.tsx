import { useEffect, useState } from 'react';
import { formatIsoDate, getChapterSummary, getRecentProjects } from '../lib/metrics';
import { ShowcaseGrid } from './ProjectsRoute';
import { useResolvedPhotoUrl } from './ResolvedPhoto';
import type { AppData, DailyCheckin } from '../types';

export type MemoryPreviewItem = {
  id: string;
  date: string;
  summary: string;
  photoDataUrls: string[];
};

type RecapRouteProps = {
  data: AppData;
  onManageShowcase: () => void;
  shareSyncError: string | null;
  isSharingConfigured: boolean;
};

const parseSummaryLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const isBulletLine = (line: string) => /^[-*•]\s+/.test(line);

const cleanBulletLine = (line: string) => line.replace(/^[-*•]\s+/, '').trim();

type SummaryBlock =
  | { type: 'text'; lines: string[] }
  | { type: 'list'; lines: string[] };

const parseSummaryBlocks = (summary: string): SummaryBlock[] => {
  const lines = parseSummaryLines(summary);
  const blocks: SummaryBlock[] = [];

  lines.forEach((line) => {
    const nextType: SummaryBlock['type'] = isBulletLine(line) ? 'list' : 'text';
    const lastBlock = blocks[blocks.length - 1];
    const nextLine = nextType === 'list' ? cleanBulletLine(line) : line;

    if (lastBlock?.type === nextType) {
      lastBlock.lines.push(nextLine);
      return;
    }

    blocks.push({ type: nextType, lines: [nextLine] });
  });

  return blocks;
};

const getMemoryHighlights = (entries: DailyCheckin[], limit = 6) => {
  return [...entries]
    .filter((entry) => entry.summary.trim() || entry.photoDataUrls.length > 0)
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit);
};

export function RecapRoute({
  data,
  onManageShowcase,
  shareSyncError,
  isSharingConfigured,
}: RecapRouteProps) {
  const summary = getChapterSummary(data);
  const showcaseItems = getRecentProjects(data.projects, Math.max(data.projects.length, 24));
  const memoryHighlights = getMemoryHighlights(data.dailyCheckins, 6);
  const title = data.shareSettings.slug?.trim() || 'your';

  return (
    <div className="route-layout">
      <section className="feature-card weekly-goals-card">
        <div className="card-header">
          <div>
            <p className="section-kicker">Wrapped</p>
            <h2>{`${title}'s memories`}</h2>
            <p className="body-copy">
              A simple recap of the days, memories, and things from this chapter.
            </p>
          </div>
        </div>

        <div className="counter-grid">
          <Counter label="Days logged" value={`${summary.totalEntries}`} />
          <Counter label="Photos" value={`${summary.photoCount}`} />
          <Counter label="Projects worked on" value={`${summary.projectsWorkedOn}`} />
        </div>
        {!isSharingConfigured ? (
          <p className="field-hint">
            Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable public sharing.
          </p>
        ) : null}
        {shareSyncError ? <p className="field-error">{shareSyncError}</p> : null}
      </section>

      <section className="feature-card">
        <div className="card-header">
          <div>
            <p className="section-kicker">Showcase</p>
            <h2>Projects, posts, videos, and links</h2>
            <p className="body-copy">
              From side projects to links of all the work you've published during this chapter of
              your life.
            </p>
          </div>

          <div className="card-actions">
            <button className="ghost-button compact-button" type="button" onClick={onManageShowcase}>
              Manage showcase
            </button>
          </div>
        </div>

        {showcaseItems.length > 0 ? (
          <ShowcaseGrid projects={showcaseItems} editable={false} />
        ) : (
          <div className="empty-state">
            <strong>No showcase items yet.</strong>
            <p>
              Add projects, posts, videos, channels, profiles, or any public link you want to keep
              with this chapter.
            </p>
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

        {memoryHighlights.length > 0 ? (
          <MemoryPreviewGrid
            entries={memoryHighlights.map((entry) => ({
              id: entry.id,
              date: entry.date,
              summary: entry.summary,
              photoDataUrls: entry.photoDataUrls,
            }))}
          />
        ) : (
          <div className="empty-state">
            <strong>No days yet.</strong>
            <p>The highlights fill in as the calendar gets real.</p>
          </div>
        )}
      </section>

    </div>
  );
}

export function MemoryPreviewGrid({ entries }: { entries: MemoryPreviewItem[] }) {
  const [activeEntry, setActiveEntry] = useState<MemoryPreviewItem | null>(null);

  useEffect(() => {
    if (!activeEntry) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveEntry(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeEntry]);

  return (
    <>
      <div className="recent-day-grid">
        {entries.map((entry) => (
          <button
            key={entry.id}
            className="memory-preview-card"
            type="button"
            onClick={() => setActiveEntry(entry)}
          >
            <MemoryPreviewCarousel entry={entry} />
            <div className="memory-preview-copy">
              <strong>{formatIsoDate(entry.date)}</strong>
              <MemoryPreviewSummary summary={entry.summary} />
            </div>
          </button>
        ))}
      </div>

      {activeEntry ? (
        <div
          className="memory-modal-backdrop"
          role="presentation"
          onClick={() => setActiveEntry(null)}
        >
          <div
            className="memory-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="memory-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="memory-modal-header">
              <div>
                <p className="section-kicker">Day</p>
                <h2 id="memory-modal-title">{formatIsoDate(activeEntry.date)}</h2>
              </div>
              <button
                className="ghost-button compact-button"
                type="button"
                onClick={() => setActiveEntry(null)}
              >
                Close
              </button>
            </div>

            {activeEntry.photoDataUrls.length > 0 ? (
              <div className="memory-modal-carousel">
                {activeEntry.photoDataUrls.map((photoDataUrl, index) => (
                  <ResolvedPhotoAnchor
                    key={`${activeEntry.id}-modal-${index}`}
                    source={photoDataUrl}
                    linkClassName="memory-modal-photo-link"
                    imageClassName="memory-modal-photo"
                  />
                ))}
              </div>
            ) : null}

            <div className="memory-modal-copy">
              <DaySummary summary={activeEntry.summary} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MemoryPreviewCarousel({ entry }: { entry: MemoryPreviewItem }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const photoCount = entry.photoDataUrls.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [entry.id]);

  useEffect(() => {
    if (photoCount <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % photoCount);
    }, 2800);

    return () => window.clearInterval(interval);
  }, [photoCount]);

  if (photoCount === 0) {
    return <div className="memory-photo-empty">No photo</div>;
  }

  return (
    <div className="memory-photo-carousel">
      <ResolvedMemoryPhoto source={entry.photoDataUrls[activeIndex] ?? null} />
      {photoCount > 1 ? (
        <>
          <div className="memory-dot-row" aria-hidden="true">
            {entry.photoDataUrls.map((_, index) => (
              <span
                key={`${entry.id}-dot-${index}`}
                className={index === activeIndex ? 'memory-dot active' : 'memory-dot'}
              />
            ))}
          </div>
          <span className="memory-more-badge">{`${activeIndex + 1}/${photoCount}`}</span>
        </>
      ) : null}
    </div>
  );
}

function MemoryPreviewSummary({ summary }: { summary: string }) {
  if (!summary.trim()) {
    return <p>Nothing written yet.</p>;
  }

  const blocks = parseSummaryBlocks(summary);
  const introBlock = blocks.find((block) => block.type === 'text');
  const bulletLines = blocks.flatMap((block) => (block.type === 'list' ? block.lines : []));

  if (bulletLines.length > 0) {
    const previewLines = bulletLines.slice(0, 3);
    const remainingCount = bulletLines.length - previewLines.length;

    return (
      <div className="memory-preview-summary">
        {introBlock ? <p className="memory-preview-intro">{introBlock.lines.join(' ')}</p> : null}
        <ul className="memory-preview-list">
          {previewLines.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
          {remainingCount > 0 ? (
            <li className="memory-preview-more">{`+${remainingCount} more`}</li>
          ) : null}
        </ul>
      </div>
    );
  }

  const previewText = blocks
    .flatMap((block) => block.lines)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return <p>{previewText}</p>;
}

function ResolvedMemoryPhoto({ source }: { source: string | null }) {
  const resolvedPhotoUrl = useResolvedPhotoUrl(source);

  if (!resolvedPhotoUrl) {
    return <div className="memory-photo-empty">Loading photo</div>;
  }

  return <img className="memory-photo-slide" src={resolvedPhotoUrl} alt="" />;
}

function ResolvedPhotoAnchor({
  source,
  linkClassName,
  imageClassName,
}: {
  source: string;
  linkClassName: string;
  imageClassName: string;
}) {
  const resolvedPhotoUrl = useResolvedPhotoUrl(source);

  if (!resolvedPhotoUrl) {
    return <div className={imageClassName} aria-hidden="true" />;
  }

  return (
    <a className={linkClassName} href={resolvedPhotoUrl} target="_blank" rel="noreferrer">
      <img className={imageClassName} src={resolvedPhotoUrl} alt="" />
    </a>
  );
}

export function DaySummary({ summary }: { summary: string }) {
  if (!summary.trim()) {
    return <p>Nothing written yet.</p>;
  }

  const blocks = parseSummaryBlocks(summary);

  return (
    <div className="day-summary-blocks">
      {blocks.map((block, blockIndex) =>
        block.type === 'list' ? (
          <ul className="day-summary-list" key={`list-${blockIndex}`}>
            {block.lines.map((line, lineIndex) => (
              <li key={`${line}-${lineIndex}`}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="day-summary-text" key={`text-${blockIndex}`}>
            {block.lines.join(' ')}
          </p>
        ),
      )}
    </div>
  );
}

export function Counter({ label, value }: { label: string; value: string }) {
  return (
    <div className="counter-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
