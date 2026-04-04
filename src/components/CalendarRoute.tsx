import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { formatDateInput, todayDateInput } from '../lib/dates';
import { formatIsoDate, getDailyCheckinByDate } from '../lib/metrics';
import {
  fetchGoogleCalendarMonthEvents,
  requestGoogleCalendarToken,
} from '../lib/googleCalendar';
import {
  isSupabasePhotoStorageConfigured,
  isSupabasePhotoUrl,
  removeChapterPhotoByUrl,
  UNSUPPORTED_PHOTO_MESSAGE,
  uploadChapterPhotoFile,
} from '../lib/supabasePhotos';
import { useResolvedPhotoUrl } from './ResolvedPhoto';
import type { AppData, DailyCheckin, SyncedCalendarEvent } from '../types';

type CalendarRouteProps = {
  data: AppData;
  photoStorageUserId: string | null;
  onSave: (entry: Omit<DailyCheckin, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onSaveGoogleCalendarSync: (payload: {
    syncedMonth: string;
    events: SyncedCalendarEvent[];
  }) => void;
};

type CalendarDraft = {
  date: string;
  summary: string;
  photoDataUrls: string[];
  shareVisibility: DailyCheckin['shareVisibility'];
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const shiftMonth = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const startOfNextMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1);

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);

const buildCalendarDays = (month: Date) => {
  const first = startOfMonth(month);
  const start = new Date(first);
  const day = first.getDay();
  start.setDate(first.getDate() - day);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
};

const createDraft = (entry: DailyCheckin | null, date = todayDateInput()): CalendarDraft => {
  return {
    date,
    summary: entry?.summary ?? entry?.note ?? '',
    photoDataUrls: entry?.photoDataUrls?.slice(0, 1) ?? [],
    shareVisibility: entry?.shareVisibility ?? 'public',
  };
};

const formatTimeRange = (event: SyncedCalendarEvent) => {
  if (event.isAllDay) {
    return 'All day';
  }

  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

const doesEventMatchDate = (event: SyncedCalendarEvent, date: string) => {
  if (event.isAllDay) {
    const endDate = event.endDateExclusive ?? event.startDate;

    return date >= event.startDate && date < endDate;
  }

  const startDate = formatDateInput(new Date(event.startAt));
  const endDate = formatDateInput(new Date(event.endAt));

  return date >= startDate && date <= endDate;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read image.'));
        return;
      }

      resolve(reader.result);
    };

    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });

export function CalendarRoute({
  data,
  photoStorageUserId,
  onSave,
  onSaveGoogleCalendarSync,
}: CalendarRouteProps) {
  const today = todayDateInput();
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => todayDateInput());
  const [draft, setDraft] = useState<CalendarDraft>(() => createDraft(null));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [photoMessage, setPhotoMessage] = useState<string | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [isMutatingPhotos, setIsMutatingPhotos] = useState(false);
  const [hasGrantedCalendarAccess, setHasGrantedCalendarAccess] = useState(
    data.googleCalendar.isConnected,
  );
  const previousSelectedDateRef = useRef(selectedDate);
  const skipNextEntrySyncRef = useRef(false);
  const isDraftDirtyRef = useRef(false);
  const selectedEntry = getDailyCheckinByDate(data.dailyCheckins, selectedDate);
  const calendarDays = useMemo(() => buildCalendarDays(monthCursor), [monthCursor]);
  const monthLabel = formatMonthLabel(monthCursor);
  const selectedDateCalendarEvents = useMemo(
    () =>
      data.googleCalendar.events
        .filter((event) => doesEventMatchDate(event, selectedDate))
        .sort((left, right) => left.startAt.localeCompare(right.startAt)),
    [data.googleCalendar.events, selectedDate],
  );
  const entryDates = useMemo(
    () => new Set(data.dailyCheckins.map((entry) => entry.date)),
    [data.dailyCheckins],
  );
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
  const isEditingToday = selectedDate === today;
  const canStorePhotosRemotely =
    Boolean(photoStorageUserId) && isSupabasePhotoStorageConfigured();
  const resolvedPhotoUrl = useResolvedPhotoUrl(draft.photoDataUrls[0] ?? null);
  const photoFieldHint = canStorePhotosRemotely
    ? 'Optional. Stored in Supabase so they show up across devices and on your public page.'
    : 'Optional. Stored in your browser for now.';

  useEffect(() => {
    const didDateChange = previousSelectedDateRef.current !== selectedDate;
    previousSelectedDateRef.current = selectedDate;

    if (didDateChange) {
      isDraftDirtyRef.current = false;
      setDraft(createDraft(selectedEntry, selectedDate));
      setSaveMessage(null);
      setPhotoMessage(null);
      return;
    }

    if (skipNextEntrySyncRef.current) {
      skipNextEntrySyncRef.current = false;
      isDraftDirtyRef.current = false;
      return;
    }

    if (isDraftDirtyRef.current) {
      return;
    }

    setDraft(createDraft(selectedEntry, selectedDate));
    setSaveMessage(null);
    setPhotoMessage(null);
  }, [
    selectedDate,
    selectedEntry?.updatedAt,
    selectedEntry?.summary,
    selectedEntry?.shareVisibility,
    selectedEntry?.photoDataUrls[0],
  ]);

  useEffect(() => {
    if (!saveMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setSaveMessage(null);
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [saveMessage]);

  useEffect(() => {
    if (!calendarMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCalendarMessage(null);
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [calendarMessage]);

  const handleSyncCalendar = async (prompt: 'consent' | '' = '') => {
    if (!googleClientId) {
      setCalendarError('Google Calendar is not configured for this app.');
      return;
    }

    setIsSyncingCalendar(true);
    setCalendarError(null);
    setCalendarMessage(null);

    try {
      const accessToken = await requestGoogleCalendarToken(googleClientId, prompt);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const monthStart = formatDateInput(startOfMonth(monthCursor));
      const monthEndExclusive = formatDateInput(startOfNextMonth(monthCursor));
      const events = await fetchGoogleCalendarMonthEvents({
        accessToken,
        monthStart,
        monthEndExclusive,
        timeZone,
      });

      onSaveGoogleCalendarSync({
        syncedMonth: monthStart,
        events,
      });
      setHasGrantedCalendarAccess(true);
      setCalendarMessage('Calendar synced');
    } catch (error) {
      setCalendarError(
        error instanceof Error ? error.message : 'Could not sync Google Calendar right now.',
      );
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsMutatingPhotos(true);

    try {
      let nextPhotoUrl: string;
      let nextPhotoMessage: string | null = null;

      if (canStorePhotosRemotely && photoStorageUserId) {
        try {
          nextPhotoUrl = await uploadChapterPhotoFile({
            file,
            userId: photoStorageUserId,
            date: draft.date,
          });
        } catch (error) {
          if (error instanceof Error && error.message === UNSUPPORTED_PHOTO_MESSAGE) {
            throw error;
          }

          console.error(
            'Could not upload photo to Supabase storage. Falling back to local-only.',
            error,
          );
          nextPhotoUrl = await readFileAsDataUrl(file);
          nextPhotoMessage = 'Stored locally on this device for now.';
        }
      } else {
        nextPhotoUrl = await readFileAsDataUrl(file);
      }

      const currentPhotoUrl = draft.photoDataUrls[0] ?? null;

      if (currentPhotoUrl && isSupabasePhotoUrl(currentPhotoUrl)) {
        void removeChapterPhotoByUrl(currentPhotoUrl).catch((error) => {
          console.error('Could not delete replaced photo from Supabase storage.', error);
        });
      }

      setDraft((current) => ({
        ...current,
        photoDataUrls: [nextPhotoUrl],
      }));
      isDraftDirtyRef.current = true;
      setPhotoMessage(nextPhotoMessage);
      setSaveMessage(null);
    } catch (error) {
      if (error instanceof Error && error.message === UNSUPPORTED_PHOTO_MESSAGE) {
        setPhotoMessage(UNSUPPORTED_PHOTO_MESSAGE);
      } else {
        setPhotoMessage(
          canStorePhotosRemotely
            ? 'Could not upload that photo right now.'
            : 'Could not load that photo.',
        );
      }
    } finally {
      setIsMutatingPhotos(false);
      event.target.value = '';
    }
  };

  const handleRemovePhoto = async (photoDataUrl: string, index: number) => {
    if (!isEditingToday) {
      return;
    }

    setIsMutatingPhotos(true);

    try {
      if (isSupabasePhotoUrl(photoDataUrl)) {
        await removeChapterPhotoByUrl(photoDataUrl);
      }

      setDraft((current) => ({
        ...current,
        photoDataUrls: current.photoDataUrls.filter((_, currentIndex) => currentIndex !== index),
      }));
      isDraftDirtyRef.current = true;
      setPhotoMessage(null);
      setSaveMessage(null);
    } catch {
      setPhotoMessage('Could not remove that photo right now.');
    } finally {
      setIsMutatingPhotos(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEditingToday) {
      return;
    }

    skipNextEntrySyncRef.current = true;

    onSave({
      date: draft.date,
      mood: selectedEntry?.mood ?? 5,
      selfTrust: selectedEntry?.selfTrust ?? 5,
      hoursBuilding: selectedEntry?.hoursBuilding ?? 0,
      hoursJobSearching: selectedEntry?.hoursJobSearching ?? 0,
      applicationsSent: selectedEntry?.applicationsSent ?? 0,
      didExercise: selectedEntry?.didExercise ?? false,
      didMeaningfulThing: selectedEntry?.didMeaningfulThing ?? false,
      dailyFocus: selectedEntry?.dailyFocus ?? '',
      planItems: selectedEntry?.planItems ?? [],
      tomorrowFocus: selectedEntry?.tomorrowFocus ?? '',
      isHighlight: false,
      highlightNote: '',
      didDayCount: selectedEntry?.didDayCount ?? null,
      focusStatus: selectedEntry?.focusStatus ?? null,
      summary: draft.summary.trim(),
      highlights: selectedEntry?.highlights ?? [],
      tags: selectedEntry?.tags ?? [],
      photoDataUrls: draft.photoDataUrls.slice(0, 1),
      shareVisibility: draft.shareVisibility,
      note: draft.summary.trim(),
    });

    isDraftDirtyRef.current = false;
    setSaveMessage('Day saved');
  };

  return (
    <div className="route-layout calendar-route-layout">
      <section className="calendar-grid">
        <article className="feature-card calendar-card">
          <div className="card-header">
            <div>
              <p className="section-kicker">Calendar</p>
              <h2>{monthLabel}</h2>
            </div>
          </div>

          <div className="calendar-toolbar">
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={() => setMonthCursor((current) => shiftMonth(current, -1))}
            >
              Previous
            </button>
            <strong>{monthLabel}</strong>
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={() => setMonthCursor((current) => shiftMonth(current, 1))}
            >
              Next
            </button>
          </div>

          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="calendar-month-grid">
            {calendarDays.map((day) => {
              const dateKey = formatDateInput(day);
              const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
              const isSelected = dateKey === selectedDate;
              const hasEntry = entryDates.has(dateKey);
              const isToday = dateKey === today;

              return (
                <button
                  key={dateKey}
                  className={[
                    'calendar-day',
                    isCurrentMonth ? '' : 'muted',
                    isSelected ? 'selected' : '',
                    hasEntry ? 'has-entry' : '',
                    isToday ? 'today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  type="button"
                  onClick={() => {
                    setSelectedDate(dateKey);
                    setMonthCursor(startOfMonth(day));
                  }}
                >
                  <span>{day.getDate()}</span>
                  {hasEntry ? <small /> : null}
                </button>
              );
            })}
          </div>
        </article>

        <article className="feature-card calendar-day-card">
          <div className="card-header">
            <div>
              <p className="section-kicker">Day</p>
              <h2>{formatIsoDate(selectedDate)}</h2>
            </div>

            <div className="card-actions">
              <button
                className="ghost-button compact-button"
                type="button"
                onClick={() => {
                  void handleSyncCalendar(hasGrantedCalendarAccess ? '' : 'consent');
                }}
                disabled={isSyncingCalendar}
              >
                {isSyncingCalendar
                  ? 'Syncing...'
                  : hasGrantedCalendarAccess || data.googleCalendar.isConnected
                    ? 'Sync'
                    : 'Connect Google Calendar'}
              </button>
            </div>
          </div>

          {selectedDateCalendarEvents.length > 0 ? (
            <section className="calendar-events-panel" aria-label="Google Calendar events">
              {selectedDateCalendarEvents.map((event) => (
                <article key={`${event.calendarId}-${event.id}`} className="calendar-event-row">
                  <div className="calendar-event-time">{formatTimeRange(event)}</div>
                  <div className="calendar-event-copy">
                    {event.htmlLink ? (
                      <a
                        className="calendar-event-link"
                        href={event.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {event.title}
                      </a>
                    ) : (
                      <strong>{event.title}</strong>
                    )}
                  </div>
                </article>
              ))}
            </section>
          ) : null}

          {calendarError ? <p className="field-error">{calendarError}</p> : null}
          {photoMessage ? <p className="form-note">{photoMessage}</p> : null}
          {!isEditingToday ? (
            <p className="field-hint">
              Only today can be edited. Past days stay read-only so the chapter gets written in
              real time.
            </p>
          ) : null}

          <form className="daily-form" onSubmit={handleSubmit}>
            <Field label="What did you do?">
              <textarea
                rows={6}
                placeholder="Worked on the app, hung out with friends, rotted in bed, applied to five jobs, or anything else that made up the day."
                value={draft.summary}
                disabled={!isEditingToday}
                onChange={(event) => {
                  isDraftDirtyRef.current = true;
                  setDraft((current) => ({
                    ...current,
                    summary: event.target.value,
                  }));
                  setSaveMessage(null);
                }}
              />
            </Field>

            <Field label="Photo" hint={photoFieldHint}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                disabled={!isEditingToday || isMutatingPhotos}
                onChange={handlePhotoChange}
              />
            </Field>

            {draft.photoDataUrls.length > 0 ? (
              <div className="photo-preview-grid">
                {draft.photoDataUrls.slice(0, 1).map((photoDataUrl, index) => (
                  <div key={`${photoDataUrl.slice(0, 48)}-${index}`} className="photo-preview-card">
                    {resolvedPhotoUrl ? (
                      <a
                        className="photo-preview-link"
                        href={resolvedPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open photo ${index + 1}`}
                      >
                        <img src={resolvedPhotoUrl} alt="" />
                      </a>
                    ) : (
                      <div className="photo-preview-link photo-preview-loading" aria-hidden="true" />
                    )}
                    <button
                      className="photo-remove-button"
                      type="button"
                      disabled={!isEditingToday || isMutatingPhotos}
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => {
                        void handleRemovePhoto(photoDataUrl, index);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="share-options-card">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={draft.shareVisibility === 'private'}
                  disabled={!isEditingToday}
                  onChange={(event) => {
                    const isPrivate = event.target.checked;

                    isDraftDirtyRef.current = true;
                    setDraft((current) => ({
                      ...current,
                      shareVisibility: isPrivate ? 'private' : 'public',
                    }));
                    setSaveMessage(null);
                  }}
                />
                <span>Make this day private</span>
              </label>
            </div>

            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={!isEditingToday || isMutatingPhotos}
              >
                {isEditingToday ? (selectedEntry ? 'Update day' : 'Save day') : 'Today only'}
              </button>
            </div>
          </form>
        </article>
      </section>

      {saveMessage ? (
        <div className="save-toast" role="status" aria-live="polite">
          {saveMessage}
        </div>
      ) : null}

      {calendarMessage ? (
        <div className="save-toast save-toast-secondary" role="status" aria-live="polite">
          {calendarMessage}
        </div>
      ) : null}
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
