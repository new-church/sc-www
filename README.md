# sc-www

Swedenborg Centre website (swedenborg.com.au). Astro on Vercel, Bulma CSS.

This branch (`astro-port`) is a like-for-like port of the old Hugo site, which is kept for reference in `legacy-hugo/`.

## Run

```bash
npm install
npm run dev      # http://localhost:4321
npm run build
npm run check    # type-check
```

## How it works

- **Events** come from the Centre's public Google Calendar (ICS), fetched on request and cached at Vercel's edge
  (`s-maxage=300, stale-while-revalidate`). Past events drop off automatically; recurring events are expanded.
  Extra content (image, long description, Zoom link) lives in `src/content/event-info/*.md`, matched to calendar
  events by title (`match:`). `src/lib/events.ts` holds the feed logic.
- **Pages** are Markdown in `src/content/pages` (`.mdx` where a page embeds a file list). News posts are in `src/content/news`.
- **File lists** (audio, PDFs, Candela) are YAML in `src/data`; files are referenced by path and resolved against `PUBLIC_STATIC_URL`.
- **Images** are in `src/assets/images`, referenced by path through `src/components/Img.astro` (optimised at build).

## Config

See `.env.example`. Both variables are optional.
