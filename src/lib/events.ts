import ICAL from 'ical.js';
import { getCollection, type CollectionEntry } from 'astro:content';
import { hm, wallClockToInstant, ymd } from './dates';
import { site } from './site';

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
  /** title without a trailing clock-time bracket (see displayTitle) */
  displayTitle: string;
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
  /** Cancelled on purpose: "cancelled" in the title (rename one occurrence in Google Calendar), or STATUS:CANCELLED. A deleted event is simply not listed. */
  cancelled: boolean;
  /** Image for cards: from the event's info folder or src/assets/images (see resolveImage). */
  image?: string;
};

export const slugify = (s: string, max = 60) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max);

/**
 * The title as shown on the site. Joe sometimes types the time into the calendar title, e.g. "Open discussion (weekly,
 * 11am-1pm)": that clock time is fixed to one zone and would mislead viewers in another, while the site already shows
 * each event's time in the viewer's zone. So a trailing bracket that contains a clock time is left off the displayed
 * title. The full title is still used for matching event folders.
 */
export const displayTitle = (t: string): string =>
  t.replace(/\s*\([^)]*\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b[^)]*\)\s*$/i, '').trim() || t;

/**
 * A title that says the event is off. To announce a cancellation, Joe renames just that one occurrence in Google Calendar
 * (edit it, change the title to include "Cancelled", save for "This event" only). Deleting an event is NOT a
 * cancellation: it just disappears, which is how he tidies the calendar and re-plans ahead.
 */
export const isCancelledTitle = (t: string) => /\b(cancell?ed|postponed)\b/i.test(t) || /^\s*NO\s+[A-Za-z]/.test(t);

// Calendar descriptions are small HTML snippets typed by the Centre's own staff. Keep a short
// allowlist of tags, and only http(s)/mailto links. (A tiny in-house sanitiser: sanitize-html's
// CommonJS require() of ESM-only htmlparser2 fails in Vercel's runtime.)
const ALLOWED = new Set(['a', 'br', 'b', 'strong', 'i', 'em', 'u', 'p', 'ul', 'ol', 'li']);
const escapeHtml = (t: string) => t.replace(/</g, '&lt;').replace(/>/g, '&gt;');

function clean(html: string): string {
  const noScript = html.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '');
  let out = '';
  let last = 0;
  for (const m of noScript.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g)) {
    out += escapeHtml(noScript.slice(last, m.index));
    last = m.index + m[0].length;
    const [, closing, rawName, attrs] = m;
    const name = rawName.toLowerCase();
    if (!ALLOWED.has(name)) continue;
    if (closing) {
      out += name === 'br' ? '' : `</${name}>`;
    } else if (name === 'a') {
      const href = attrs.match(/href\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      const url = (href?.[1] ?? href?.[2] ?? '').trim();
      out += /^(https?:|mailto:)/i.test(url) ? `<a href="${url.replace(/"/g, '&quot;')}" target="_blank" rel="noopener">` : '<a>';
    } else {
      out += name === 'br' ? '<br>' : `<${name}>`;
    }
  }
  return out + escapeHtml(noScript.slice(last));
}

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const text = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITIES[e])
    .replace(/\s+/g, ' ')
    .trim();

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

type Raw = Omit<CalendarEvent, 'slug' | 'info' | 'zoomlink' | 'image' | 'displayTitle'>;

const validZone = (z: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: z });
    return true;
  } catch {
    return false;
  }
};
const tzidOf = (e: ICAL.Event): string | undefined => {
  const v = e.component.getFirstProperty('dtstart')?.getParameter('tzid');
  return typeof v === 'string' ? v : undefined;
};

/**
 * The true instant for a calendar time, independent of the zone this server happens to run in.
 *  - all-day dates have no time of day: UTC midnight of that calendar date (never shifted)
 *  - UTC times ("...Z") are read as UTC
 *  - times with a TZID are read as wall-clock time in that IANA zone (so it works even when the calendar file does
 *    not bundle that zone's rules)
 *  - a time with no zone at all ("floating") is taken to be in the Centre's own zone (site.timeZone)
 */
function toInstant(t: ICAL.Time, tzid?: string): Date {
  if (t.isDate) return new Date(Date.UTC(t.year, t.month - 1, t.day));
  if (t.zone && t.zone.tzid === 'UTC') return new Date(Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second));
  if (tzid && validZone(tzid)) return wallClockToInstant(t.year, t.month, t.day, t.hour, t.minute, tzid);
  if (t.zone && t.zone.tzid && t.zone.tzid !== 'floating') return t.toJSDate(); // a zone the calendar file itself defines
  return wallClockToInstant(t.year, t.month, t.day, t.hour, t.minute, site.timeZone);
}

function expand(ics: string, now: Date, since: Date): Raw[] {
  const comp = new ICAL.Component(ICAL.parse(ics));
  // Register VTIMEZONE blocks so TZID-qualified times resolve.
  for (const tz of comp.getAllSubcomponents('vtimezone')) {
    const t = new ICAL.Timezone(tz);
    ICAL.TimezoneService.register(t);
  }

  const horizon = new Date(now.getTime() + HORIZON_DAYS * 86400_000);
  const out: Raw[] = [];

  const vevents = comp.getAllSubcomponents('vevent');
  // Overrides (RECURRENCE-ID) are applied by ical.js through relateException.
  const events = vevents.map((v) => new ICAL.Event(v));
  const masters = events.filter((e) => !e.isRecurrenceException());
  for (const ex of events.filter((e) => e.isRecurrenceException())) {
    const master = masters.find((m) => m.uid === ex.uid);
    master?.relateException(ex);
  }

  const status = (e: ICAL.Event) => String(e.component.getFirstPropertyValue('status') ?? '').toUpperCase();

  for (const ev of masters) {
    const masterTitle = ev.summary ?? '';
    if (!masterTitle || EXCLUDE_TITLE.test(masterTitle)) continue;

    /** One occurrence. `item` is the master, or the edited copy when a single occurrence was changed. */
    const push = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time) => {
      const title = item.summary || masterTitle;
      if (EXCLUDE_TITLE.test(title)) return;
      const tzid = tzidOf(item) ?? tzidOf(ev);
      const s = toInstant(start, tzid);
      const e = toInstant(end, tzid);
      if (e < since || s > horizon) return;
      out.push({
        uid: ev.uid,
        title,
        location: item.location ?? '',
        descriptionHtml: clean(item.description ?? ''),
        descriptionText: text(item.description ?? ''),
        start: s,
        end: e,
        allDay: start.isDate,
        cancelled: status(item) === 'CANCELLED' || isCancelledTitle(title),
      });
    };

    if (!ev.isRecurring()) {
      push(ev, ev.startDate, ev.endDate);
      continue;
    }
    const it = ev.iterator();
    for (let n = 0, next = it.next(); next && n < MAX_OCCURRENCES_PER_SERIES; n++, next = it.next()) {
      const d = ev.getOccurrenceDetails(next);
      if (toInstant(d.startDate, tzidOf(d.item) ?? tzidOf(ev)) > horizon) break;
      push(d.item, d.startDate, d.endDate);
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

const ZOOM = /https?:\/\/[a-z0-9.]*zoom\.us\/[^\s"'<>)]+/i;

type Info = CollectionEntry<'event-info'>;

/** The folder (or file name) an info entry lives under, e.g. "open-discussion". */
export const infoFolder = (i: Info) => i.id.split('/')[0].replace(/\.mdx?$/, '');

/**
 * Pick the event-info entry for a calendar title. A folder (or file) named after the event matches when its name
 * appears in the title, e.g. folder "open-discussion" or "Swedenborg Tuesday open discussion" matches the event
 * "Swedenborg Tuesday open discussion (weekly)". Optional `match` phrases in the front matter work too. The longest
 * match wins, so a more specific folder beats a general one.
 */
function findInfo(infos: Info[], title: string): Info | undefined {
  const lower = title.toLowerCase();
  const slug = slugify(title, 200);
  let best: Info | undefined;
  let bestLen = 0;
  for (const i of infos) {
    const keys: [string, boolean][] = [
      [slugify(infoFolder(i), 200), true],
      ...((i.data.match ?? []).map((m) => [m.toLowerCase(), false]) as [string, boolean][]),
    ];
    for (const [key, isSlug] of keys) {
      if (!key) continue;
      if ((isSlug ? slug : lower).includes(key) && key.length > bestLen) {
        best = i;
        bestLen = key.length;
      }
    }
  }
  return best;
}

/** `img: ./photo.jpg` is a file in the event's folder; `img: images/x.jpg` is in src/assets/images. */
function resolveImage(info?: Info): string | undefined {
  const img = info?.data.img;
  if (!img || !info) return undefined;
  if (!img.startsWith('./')) return img;
  // The real folder on disk (Astro's entry id lower-cases it and swaps spaces for hyphens).
  const dir = (info.filePath ?? '').replace(/\/[^/]*$/, '');
  return `${dir}/${img.slice(2)}`;
}

/** Events from `since` (default now) to 150 days ahead. The calendar view passes the start of the month. */
export async function getEvents(opts: { now?: Date; since?: Date } = {}): Promise<CalendarEvent[]> {
  const now = opts.now ?? new Date();
  const ics = await fetchIcs();
  if (!ics) return [];
  const infos = await getCollection('event-info');
  return expand(ics, now, opts.since ?? now).map((e) => {
    const info = findInfo(infos, e.title);
    const zoomlink =
      info?.data.zoomlink ?? e.descriptionHtml.match(/href="([^"]*zoom\.us[^"]*)"/i)?.[1] ?? e.descriptionText.match(ZOOM)?.[0] ?? e.location.match(ZOOM)?.[0];
    return { ...e, displayTitle: displayTitle(e.title), info, zoomlink, image: resolveImage(info), slug: `${ymd(e.start)}${hm(e.start)}-${slugify(e.title)}` };
  });
}

export const icsUrl = ICS_URL;

export async function getEvent(slug: string) {
  // Look back far enough to cover every day the calendar view shows (it starts at the beginning of the month), so a
  // click on an earlier event this month, or a link to one that has just passed, still opens its page.
  return (await getEvents({ since: new Date(Date.now() - 40 * 86400_000) })).find((e) => e.slug === slug);
}

/** First n words of plain text, like Hugo's .Summary (summaryLength: 20). */
export function summary(plain: string, words = 20): string {
  const w = plain.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/^[=\-]{3,}\s*$/gm, ' ').replace(/[#*_>`]/g, '').split(/\s+/).filter(Boolean);
  return w.length > words ? w.slice(0, words).join(' ') + '…' : w.join(' ');
}
