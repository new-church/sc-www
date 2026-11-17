// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://swedenborg.com.au',
  adapter: vercel(),
  integrations: [mdx()],
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    // Hugo's render-link opened every http(s) link in a new tab.
    rehypePlugins: [
      ['rehype-external-links', { target: '_blank', rel: [] }],
    ],
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Bulma 0.9 uses Sass @import; fine until we modernise the styles.
          silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div', 'mixed-decls'],
          quietDeps: true,
        },
      },
    },
  },
});
