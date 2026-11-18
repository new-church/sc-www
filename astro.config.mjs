// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://swedenborg.com.au',
  adapter: vercel(),
  integrations: [mdx(), sitemap({ filter: (page) => !/\/subscribe\/confirm/.test(page) })],
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    // Hugo's render-link opened every http(s) link in a new tab.
    processor: unified({
      rehypePlugins: [['rehype-external-links', { target: '_blank', rel: [] }]],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
