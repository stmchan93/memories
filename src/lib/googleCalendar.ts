import { formatDateInput } from './dates';
import type { SyncedCalendarEvent } from '../types';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleCalendarApiEvent = {
  id: string;
  summary?: string;
  htmlLink?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarApiEvent[];
};

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type GoogleIdentityWindow = Window & {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
        }) => GoogleTokenClient;
      };
    };
  };
};

let googleIdentityScriptPromise: Promise<void> | null = null;

const getGoogleWindow = () => window as GoogleIdentityWindow;

const loadGoogleIdentityScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Calendar is only available in the browser.'));
  }

  if (getGoogleWindow().google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Could not load Google Identity Services.')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Could not load Google Identity Services.'));
      document.head.appendChild(script);
    });
  }

  return googleIdentityScriptPromise;
};

export const requestGoogleCalendarToken = async (
  clientId: string,
  prompt: 'consent' | '' = '',
) => {
  if (!clientId) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID.');
  }

  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const tokenClient = getGoogleWindow().google?.accounts?.oauth2?.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(response.error_description || response.error || 'Google Calendar auth failed.'),
          );
          return;
        }

        resolve(response.access_token);
      },
    });

    if (!tokenClient) {
      reject(new Error('Google Calendar auth is unavailable.'));
      return;
    }

    tokenClient.requestAccessToken({ prompt });
  });
};

const toIsoDate = (value: string) => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateInput(parsed);
};

const normalizeEvent = (event: GoogleCalendarApiEvent): SyncedCalendarEvent | null => {
  const startAt = event.start?.dateTime ?? event.start?.date ?? null;
  const endAt = event.end?.dateTime ?? event.end?.date ?? null;
  const isAllDay = Boolean(event.start?.date && !event.start?.dateTime);

  if (!startAt || !endAt) {
    return null;
  }

  const startDate = isAllDay ? event.start?.date ?? null : toIsoDate(startAt);
  const endDateExclusive = isAllDay ? event.end?.date ?? null : toIsoDate(endAt);

  if (!startDate) {
    return null;
  }

  return {
    id: event.id,
    calendarId: 'primary',
    title: event.summary?.trim() || 'Untitled event',
    startAt,
    endAt,
    startDate,
    endDateExclusive,
    isAllDay,
    htmlLink: event.htmlLink ?? null,
  };
};

export const fetchGoogleCalendarMonthEvents = async ({
  accessToken,
  monthStart,
  monthEndExclusive,
  timeZone,
}: {
  accessToken: string;
  monthStart: string;
  monthEndExclusive: string;
  timeZone: string;
}) => {
  const params = new URLSearchParams({
    timeMin: `${monthStart}T00:00:00.000Z`,
    timeMax: `${monthEndExclusive}T00:00:00.000Z`,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
    timeZone,
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Could not fetch Google Calendar events.');
  }

  const payload = (await response.json()) as GoogleCalendarEventsResponse;

  return (payload.items ?? [])
    .map((event) => normalizeEvent(event))
    .filter((event): event is SyncedCalendarEvent => event != null);
};
