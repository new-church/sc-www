import { parse } from 'yaml';

const raw = import.meta.glob('../data/*.yml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export type FileItem = {
  title: string;
  file: string;
  author?: string;
  image?: string;
  date?: string | Date;
  description?: string;
};

export type CandelaItem = {
  title: string;
  path: string;
  image?: string;
  description?: string;
  modified: string | Date;
};

function load<T>(name: string): T[] {
  const key = `../data/${name}.yml`;
  if (!(key in raw)) throw new Error(`Unknown data section: ${name}`);
  return parse(raw[key]) as T[];
}

export const fileSection = (name: string) => load<FileItem>(name);

// Values look like "2025-12-01 00:00:00 +1000 AEDT"; only the date matters for ordering.
const sortKey = (v: string | Date) => (v instanceof Date ? v.toISOString() : String(v).slice(0, 19));

export function candela(): CandelaItem[] {
  // Array.sort is stable, so items with the same date keep their order in candela.yml (newest first).
  return load<CandelaItem>('candela').sort((a, b) => sortKey(b.modified).localeCompare(sortKey(a.modified)));
}
