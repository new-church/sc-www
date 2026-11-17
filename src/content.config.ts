import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { sydneyWallClock } from './lib/dates';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    heroclass: z.string().optional(),
    img: z.string().optional(),
    hastextbackground: z.boolean().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date().transform(sydneyWallClock),
  }),
});

// Extra content layered onto Google Calendar events. An entry applies to any
// calendar event whose title contains one of the `match` strings (lowercase).
const eventInfo = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/event-info' }),
  schema: z.object({
    title: z.string(),
    match: z.array(z.string()),
    img: z.string().optional(),
    zoomlink: z.string().optional(),
  }),
});

export const collections = { pages, news, 'event-info': eventInfo };
