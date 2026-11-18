/**
 * Browser-side time zone handling. The server renders times in the Centre's own zone (so the page works without
 * JavaScript); here the browser's own zone takes over, and the viewer can flip between two views:
 *   "viewer": the browser's time zone (the default, and always what a page starts in)
 *   "home":   the Centre's own zone (Sydney)
 * Nothing is remembered between visits or pages. The Centre's zone is never named here: it comes from
 * <html data-home-tz> (set from src/lib/site.ts).
 */
const EVENT = 'tz-change';
export type Mode = 'viewer' | 'home';
let mode: Mode = 'viewer';

export const homeZone = (): string => document.documentElement.dataset.homeTz || 'UTC';
export const homeLabel = (): string => document.documentElement.dataset.homeLabel || 'Home';
export const viewerZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
/** True when the viewer is already in the Centre's zone, so there is nothing to flip between. */
export const viewerIsHome = (): boolean => viewerZone() === homeZone();

export const getMode = (): Mode => mode;
export function setMode(m: Mode): void {
  mode = m;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export const activeZone = (): string => (mode === 'home' ? homeZone() : viewerZone());

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

/**
 * Whose time this is, shown next to every time: "your time", or "Sydney time" (also used when the viewer is already
 * in the Centre's zone, where "your time" and the Centre's time are the same thing).
 */
export const zoneTag = (): string => (getMode() === 'home' || viewerIsHome() ? `${homeLabel()} time` : 'your time');

/** The zone's short name at an instant, e.g. "AEDT", "AWST", "GMT-8". */
export const abbrIn = (iso: string, zone: string): string =>
  fmt(zone, { timeZoneName: 'short' }).formatToParts(new Date(iso)).find((x) => x.type === 'timeZoneName')?.value ?? '';

/** "8:00 AM AWST (your time)": a time of day with its zone and whose zone it is. */
export function clockWithZone(iso: string, zone: string): string {
  const t = fmt(zone, { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso));
  return `${t} ${abbrIn(iso, zone)} (${zoneTag()})`;
}

/** Rewrite every <time data-tz> on the page into the active zone. */
export function applyTimes(): void {
  const zone = activeZone();
  document.querySelectorAll<HTMLTimeElement>('time[data-tz]').forEach((el) => {
    if (el.dateTime) el.textContent = `${formatFull(el.dateTime, zone)} (${zoneTag()})`;
  });
}
