import { site } from './site';

const parts = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-AU', { timeZone: site.timeZone, ...opts })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );

/** "Tue, 17 Nov 2026 11:00AM AEDT" in the Centre's own zone. This is the no-JavaScript text; the browser then shows the viewer's chosen zone. */
export function formatDateTime(d: Date): string {
  const p = parts(d, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year} ${p.hour}:${p.minute}${String(p.dayPeriod).toUpperCase()} ${p.timeZoneName}`;
}

/** Offset of a zone from UTC at an instant, in ms (positive east of Greenwich). */
function tzOffsetMs(at: Date, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      .formatToParts(at).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, p.hour === '24' ? 0 : +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant at which the wall clock in `tz` reads y-m-d h:mi (handles daylight saving). */
export function wallClockToInstant(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  return new Date(guess - tzOffsetMs(new Date(first), tz));
}

/** Midnight at the start of the month containing `at`, in zone `tz`. */
export function startOfMonthIn(at: Date, tz: string): Date {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit' }).formatToParts(at).map((x) => [x.type, x.value]));
  return wallClockToInstant(+p.year, +p.month, 1, 0, 0, tz);
}

/** ISO string (UTC) for <time datetime>. */
export const isoDate = (d: Date) => d.toISOString();

/** "20261117" in the Centre's zone. Used only to build stable event IDs (slugs), never shown. */
export function ymd(d: Date): string {
  const p = parts(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}${p.month}${p.day}`;
}

export function hm(d: Date): string {
  const p = parts(d, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${p.hour === '24' ? '00' : p.hour}${p.minute}`;
}

/**
 * Front matter dates like `2026-05-21 01:00:00` carry no zone and YAML reads them as UTC.
 * Hugo treated them as Sydney time (config timeZone); this reproduces that.
 */
export function sydneyWallClock(utcLike: Date): Date {
  const guess = new Date(utcLike.getTime());
  const asSydney = (d: Date) => {
    const p = parts(d, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  };
  const offset = asSydney(guess) - guess.getTime();
  return new Date(utcLike.getTime() - offset);
}
