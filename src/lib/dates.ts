import { site } from './site';

const parts = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-AU', { timeZone: site.timeZone, ...opts })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );

/** "Tue, 17 Nov 2026 11:00AM AEDT" (what Hugo's time.html produced, in Sydney time). */
export function formatDateTime(d: Date): string {
  const p = parts(d, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short',
  });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year} ${p.hour}:${p.minute}${String(p.dayPeriod).toUpperCase()} ${p.timeZoneName}`;
}

/** ISO string with Sydney offset for <time datetime>. */
export const isoDate = (d: Date) => d.toISOString();

/** "20261117" in Sydney time, for slugs. */
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
