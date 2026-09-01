import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://portfolio.mayankpal.co.in',
  integrations: [sitemap({ filter: (page) => !page.includes('/og-card') })],
  build: { inlineStylesheets: 'auto' },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Keep three.js in its own chunk so it is never in the critical path.
          manualChunks(id) {
            if (id.includes('three') || id.includes('@react-three')) return 'three';
          },
        },
      },
    },
  },
});
