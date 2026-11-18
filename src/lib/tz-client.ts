/**
 * Browser-side time zone handling. The server renders times in the Centre's own zone (so the page works without
 * JavaScript); here the viewer's zone, or one they pick, takes over.
 *
 * The preference is one of:  "viewer" (the browser's zone, the default),  "home" (the Centre's zone), or any IANA zone
 * name such as "Europe/London". It is remembered in localStorage and shared by every control and calendar on the page.
 * The Centre's zone is never named here: it comes from <html data-home-tz> (set from src/lib/site.ts).
 */
const KEY = 'tz-pref';
const EVENT = 'tz-change';

export const homeZone = (): string => document.documentElement.dataset.homeTz || 'UTC';
export const homeLabel = (): string => document.documentElement.dataset.homeLabel || 'Home';
export const viewerZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const valid = (z: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: z });
    return true;
  } catch {
    return false;
  }
};

export function getPref(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'viewer' || v === 'home' || (v && valid(v))) return v;
  } catch {
    /* storage blocked: fall through to the default */
  }
  return 'viewer';
}

export function setPref(p: string): void {
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function activeZone(): string {
  const p = getPref();
  return p === 'viewer' ? viewerZone() : p === 'home' ? homeZone() : p;
}

export const onTzChange = (fn: () => void): void => {
  window.addEventListener(EVENT, fn);
};

const fmt = (zone: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-AU', { timeZone: zone, ...opts });

/** "Tue, 24 Nov 2026 11:00AM AEDT": same shape as the server's text. */
export function formatFull(iso: string, zone: string): string {
  const p = Object.fromEntries(
    fmt(zone, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${p.weekday}, ${p.day} ${p.month} ${p.year} ${p.hour}:${p.minute}${String(p.dayPeriod).toUpperCase()} ${p.timeZoneName}`;
}

/** "2026-11-24": the calendar day an instant falls on in `zone`. */
export const dayKeyIn = (iso: string, zone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

/** A friendly zone name for the interface, e.g. "Europe/London (GMT)". */
export function zoneName(zone: string, at = new Date()): string {
  const abbr = fmt(zone, { timeZoneName: 'short' }).formatToParts(at).find((x) => x.type === 'timeZoneName')?.value ?? '';
  return abbr ? `${zone.replaceAll('_', ' ')} (${abbr})` : zone.replaceAll('_', ' ');
}

/** Rewrite every <time data-tz> on the page into the active zone. */
export function applyTimes(): void {
  const zone = activeZone();
  document.querySelectorAll<HTMLTimeElement>('time[data-tz]').forEach((el) => {
    if (el.dateTime) el.textContent = formatFull(el.dateTime, zone);
  });
}
