import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { formatIsoDate, getRecentProjects } from '../lib/metrics';
import type { AppData, Project, ProjectStatus, ProjectType } from '../types';

type ProjectsRouteProps = {
  data: AppData;
  onSave: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
};

type ProjectDraft = {
  itemType: ProjectType;
  name: string;
  status: ProjectStatus;
  summary: string;
  url: string;
  notes: string;
  startedAt: string;
  shippedAt: string;
  shareVisibility: Project['shareVisibility'];
};

const createDraft = (): ProjectDraft => ({
  itemType: 'project',
  name: '',
  status: 'active',
  summary: '',
  url: '',
  notes: '',
  startedAt: new Date().toISOString().slice(0, 10),
  shippedAt: '',
  shareVisibility: 'public',
});

const createDraftFromProject = (project: Project): ProjectDraft => ({
  itemType: project.itemType,
  name: project.name,
  status: project.status,
  summary: project.summary,
  url: project.url,
  notes: project.notes,
  startedAt: project.startedAt,
  shippedAt: project.shippedAt ?? '',
  shareVisibility: project.shareVisibility,
});

const getPreviewUrl = (url: string) => {
  const trimmed = url.trim();

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return null;
  }

  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(trimmed)}?w=1600`;
};

export const formatTypeLabel = (itemType: ProjectType) => {
  switch (itemType) {
    case 'post':
      return 'Post';
    case 'video':
      return 'Video';
    case 'channel':
      return 'Channel';
    case 'profile':
      return 'Profile';
    case 'link':
      return 'Link';
    default:
      return 'Project';
  }
};

export const formatStatusLabel = (status: ProjectStatus) => {
  switch (status) {
    case 'shipped':
      return 'Live';
    case 'paused':
      return 'Paused';
    default:
      return 'Active';
  }
};

const getHostLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function ProjectsRoute({ data, onSave }: ProjectsRouteProps) {
  const [draft, setDraft] = useState<ProjectDraft>(() => createDraft());
  const [isCreating, setIsCreating] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const projects = useMemo(() => getRecentProjects(data.projects, 48), [data.projects]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      return;
    }

    onSave({
      id: editingProjectId ?? undefined,
      itemType: draft.itemType,
      name: draft.name.trim(),
      status: draft.status,
      summary: draft.summary.trim(),
      url: draft.url.trim(),
      notes: draft.notes.trim(),
      startedAt: draft.startedAt,
      shippedAt: draft.shippedAt.trim() || null,
      shareVisibility: draft.shareVisibility,
    });

    setSaveMessage(`${editingProjectId ? 'Updated' : 'Saved'} ${draft.name.trim()}.`);
    setDraft(createDraft());
    setIsCreating(false);
    setEditingProjectId(null);
  };

  if (isCreating) {
    return (
      <div className="route-layout">
        <article className="feature-card project-editor-card">
          <div className="project-page-header">
            <div>
              <p className="section-kicker">Showcase</p>
              <h2>{editingProjectId ? 'Edit this item' : 'Add something from this chapter'}</h2>
            </div>
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={() => {
                setIsCreating(false);
                setDraft(createDraft());
                setEditingProjectId(null);
              }}
            >
              Back to showcase
            </button>
          </div>

          <form className="daily-form" onSubmit={handleSubmit}>
            <div className="field-grid">
              <Field label="Type">
                <select
                  value={draft.itemType}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      itemType: event.target.value as ProjectType,
                    }))
                  }
                >
                  <option value="project">Project</option>
                  <option value="post">Post</option>
                  <option value="video">Video</option>
                  <option value="channel">Channel</option>
                  <option value="profile">Profile</option>
                  <option value="link">Link</option>
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      status: event.target.value as ProjectStatus,
                    }))
                  }
                >
                  <option value="active">Active</option>
                  <option value="shipped">Live / shipped</option>
                  <option value="paused">Paused</option>
                </select>
              </Field>
            </div>

            <Field label="Name or title">
              <input
                type="text"
                placeholder="Runway, YouTube channel, or a post title"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Short description">
              <textarea
                rows={3}
                placeholder="What it is, why it matters, or where it stands right now."
                value={draft.summary}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }))
                }
              />
            </Field>

            <Field label="Link">
              <input
                type="url"
                placeholder="https://youtube.com, https://tiktok.com, https://instagram.com, https://your-app.vercel.app"
                value={draft.url}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
              />
            </Field>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.shareVisibility === 'public'}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    shareVisibility: event.target.checked ? 'public' : 'private',
                  }))
                }
              />
              <span>Show this item on the public chapter page</span>
            </label>

            <div className="field-grid">
              <Field label="Started or published">
                <input
                  type="date"
                  value={draft.startedAt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      startedAt: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="End date">
                <input
                  type="date"
                  value={draft.shippedAt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      shippedAt: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                rows={5}
                placeholder="Why it matters, what happened, or what this link represents."
                value={draft.notes}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </Field>

            <div className="form-actions">
              <button className="primary-button" type="submit">
                {editingProjectId ? 'Update item' : 'Save item'}
              </button>
            </div>
          </form>
        </article>
      </div>
    );
  }

  return (
    <div className="route-layout">
      <section className="feature-card">
        <div className="project-page-header">
          <div>
            <p className="section-kicker">Showcase</p>
            <h2>Projects, posts, videos, and links from the chapter</h2>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setIsCreating(true);
              setSaveMessage(null);
            }}
          >
            Add item
          </button>
        </div>

        {saveMessage ? <p className="save-banner">{saveMessage}</p> : null}

        {projects.length > 0 ? (
          <ShowcaseGrid
            projects={projects}
            onEdit={(project) => {
              setDraft(createDraftFromProject(project));
              setEditingProjectId(project.id);
              setIsCreating(true);
              setSaveMessage(null);
            }}
          />
        ) : (
          <div className="empty-state">
            <strong>No showcase items yet.</strong>
            <p>Add finished work, things in progress, profiles, posts, videos, or any link you want to remember and share.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function ShowcaseGrid({
  projects,
  onEdit,
  editable = true,
}: {
  projects: Project[];
  onEdit?: (project: Project) => void;
  editable?: boolean;
}) {
  return (
    <div className="project-grid">
      {projects.map((project) => (
        <ShowcaseCard
          key={project.id}
          project={project}
          typeLabel={formatTypeLabel(project.itemType)}
          statusLabel={formatStatusLabel(project.status)}
          onEdit={onEdit ? () => onEdit(project) : undefined}
          isEditable={editable}
        />
      ))}
    </div>
  );
}

export function ShowcaseCard({
  project,
  typeLabel,
  statusLabel,
  onEdit,
  isEditable = true,
}: {
  project: Project;
  typeLabel: string;
  statusLabel: string;
  onEdit?: () => void;
  isEditable?: boolean;
}) {
  const className = project.url
    ? 'project-showcase-card project-showcase-link-card'
    : 'project-showcase-card project-showcase-static-card';

  const content = (
    <>
      <ProjectPreview project={project} />
      <div className="project-showcase-copy">
        <div className="project-card-header">
          <div className="project-title-stack">
            <span className="project-type-label">{typeLabel}</span>
            <strong>{project.name}</strong>
          </div>
          <span
            className={`goal-pill tone-${
              project.status === 'shipped'
                ? 'complete'
                : project.status === 'active'
                  ? 'on-pace'
                  : 'needs-data'
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="project-summary">{project.summary || 'No description yet.'}</p>
        <div className="project-meta-row">
          <p className="project-meta">
            {project.startedAt ? formatIsoDate(project.startedAt) : 'No start date'}
            {project.shippedAt ? ` · Ended ${formatIsoDate(project.shippedAt)}` : ' · Ongoing'}
            {` · ${project.shareVisibility === 'public' ? 'Public' : 'Private'}`}
          </p>
          {isEditable && onEdit ? (
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onEdit();
              }}
            >
              Edit
            </button>
          ) : null}
        </div>
      </div>
    </>
  );

  if (project.url) {
    return (
      <a
        className={className}
        href={project.url}
        target="_blank"
        rel="noreferrer"
      >
        {content}
      </a>
    );
  }

  return <article className={className}>{content}</article>;
}

function ProjectPreview({ project }: { project: Project }) {
  const [didFail, setDidFail] = useState(false);
  const previewUrl = getPreviewUrl(project.url);
  const hostLabel = getHostLabel(project.url);

  if (previewUrl && !didFail) {
    return (
      <div className="project-preview">
        <img
          src={previewUrl}
          alt={`${project.name} preview`}
          loading="lazy"
          onError={() => setDidFail(true)}
        />
      </div>
    );
  }

  return (
      <div className="project-preview project-preview-fallback">
      <strong>{project.name}</strong>
      <span>{hostLabel || 'Add any public link to show a preview.'}</span>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}
