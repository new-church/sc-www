import ICAL from 'ical.js';
import sanitizeHtml from 'sanitize-html';
import { getCollection, type CollectionEntry } from 'astro:content';
import { hm, ymd } from './dates';

// The Centre's public Google Calendar. Override with EVENTS_ICS_URL (e.g. a secret address).
const ICS_URL =
  import.meta.env.EVENTS_ICS_URL ??
  'https://calendar.google.com/calendar/ical/joe%40swedenborg.com.au/public/basic.ics';

const HORIZON_DAYS = 150;
const MAX_OCCURRENCES_PER_SERIES = 200;
// Internal entries that currently sit on the public calendar. Remove once the calendar is tidied.
const EXCLUDE_TITLE = /committee|^meeting with/i;

export type CalendarEvent = {
  uid: string;
  slug: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  /** Sanitised HTML from the calendar entry's description (may be empty). */
  descriptionHtml: string;
  /** Plain text of the description. */
  descriptionText: string;
  location: string;
  zoomlink?: string;
  info?: CollectionEntry<'event-info'>;
};

export const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const clean = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: ['a', 'br', 'b', 'strong', 'i', 'em', 'u', 'p', 'ul', 'ol', 'li'],
    allowedAttributes: { a: ['href'] },
    transformTags: { a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener' }) },
  });
const text = (html: string) => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();

// ---- last-good cache (per server instance) -------------------------------
let cache: { at: number; body: string } | undefined;
const TTL_MS = 60_000; // CDN caching does the heavy lifting; this just collapses bursts.

async function fetchIcs(): Promise<string | undefined> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.body;
  try {
    const res = await fetch(ICS_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`ICS ${res.status}`);
    const body = await res.text();
    if (!body.includes('BEGIN:VCALENDAR')) throw new Error('ICS not a calendar');
    cache = { at: Date.now(), body };
    return body;
  } catch (err) {
    console.error('[events] calendar fetch failed, using last good copy:', err);
    return cache?.body; // TODO: also persist last-good to Blob so cold starts survive a Google outage
  }
}

function expand(ics: string, now: Date): Omit<CalendarEvent, 'slug' | 'info' | 'zoomlink'>[] {
  const comp = new ICAL.Component(ICAL.parse(ics));
  // Register VTIMEZONE blocks so TZID-qualified times resolve.
  for (const tz of comp.getAllSubcomponents('vtimezone')) {
    const t = new ICAL.Timezone(tz);
    ICAL.TimezoneService.register(t);
  }

  const horizon = new Date(now.getTime() + HORIZON_DAYS * 86400_000);
  const out: Omit<CalendarEvent, 'slug' | 'info' | 'zoomlink'>[] = [];

  const vevents = comp.getAllSubcomponents('vevent');
  // Overrides (RECURRENCE-ID) are applied by ical.js through relateException.
  const events = vevents.map((v) => new ICAL.Event(v));
  const masters = events.filter((e) => !e.isRecurrenceException());
  for (const ex of events.filter((e) => e.isRecurrenceException())) {
    const master = masters.find((m) => m.uid === ex.uid);
    master?.relateException(ex);
  }

  for (const ev of masters) {
    const title = ev.summary ?? '';
    if (!title || EXCLUDE_TITLE.test(title)) continue;
    const base = {
      uid: ev.uid,
      title,
      location: ev.location ?? '',
      descriptionHtml: clean(ev.description ?? ''),
      descriptionText: text(ev.description ?? ''),
    };
    const push = (start: ICAL.Time, end: ICAL.Time) => {
      const s = start.toJSDate();
      const e = end.toJSDate();
      if (e < now || s > horizon) return;
      out.push({ ...base, start: s, end: e, allDay: start.isDate });
    };

    if (!ev.isRecurring()) {
      push(ev.startDate, ev.endDate);
      continue;
    }
    const it = ev.iterator();
    for (let n = 0, next = it.next(); next && n < MAX_OCCURRENCES_PER_SERIES; n++, next = it.next()) {
      const d = ev.getOccurrenceDetails(next);
      if (d.startDate.toJSDate() > horizon) break;
      push(d.startDate, d.endDate);
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

const ZOOM = /https?:\/\/[a-z0-9.]*zoom\.us\/[^\s"'<>)]+/i;

export async function getEvents(now = new Date()): Promise<CalendarEvent[]> {
  const ics = await fetchIcs();
  if (!ics) return [];
  const infos = await getCollection('event-info');
  return expand(ics, now).map((e) => {
    const lower = e.title.toLowerCase();
    const info = infos.find((i) => i.data.match.some((m) => lower.includes(m.toLowerCase())));
    const zoomlink =
      info?.data.zoomlink ?? e.descriptionHtml.match(/href="([^"]*zoom\.us[^"]*)"/i)?.[1] ?? e.descriptionText.match(ZOOM)?.[0] ?? e.location.match(ZOOM)?.[0];
    return { ...e, info, zoomlink, slug: `${ymd(e.start)}${hm(e.start)}-${slugify(e.title)}` };
  });
}

export async function getEvent(slug: string) {
  return (await getEvents()).find((e) => e.slug === slug);
}

/** First n words of plain text, like Hugo's .Summary (summaryLength: 20). */
export function summary(plain: string, words = 20): string {
  const w = plain.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^[=\-]{3,}\s*$/gm, ' ').replace(/[#*_>`]/g, '').split(/\s+/).filter(Boolean);
  return w.length > words ? w.slice(0, words).join(' ') + '…' : w.join(' ');
}
