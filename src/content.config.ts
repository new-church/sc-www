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

// Extra content layered onto Google Calendar events (images, a longer description, a Zoom link, attachments).
// One folder per event series under src/content/event-info/, named after the event: the folder
// "open-discussion" is picked up by any calendar event whose title contains "open discussion". Put the notes in
// the folder's index.md and any pictures beside it. `match` is optional extra phrases.
const eventInfo = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/event-info' }),
  schema: z.object({
    title: z.string().optional(),
    match: z.array(z.string()).optional(),
    /** `./photo.jpg` (a file in this folder) or `images/photo.jpg` (in src/assets/images). */
    img: z.string().optional(),
    zoomlink: z.string().optional(),
    /** Extra downloads shown on the event page. */
    attachments: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
  }),
});

export const collections = { pages, news, 'event-info': eventInfo };
