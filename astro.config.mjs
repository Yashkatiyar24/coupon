import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: change to your real domain before deploy (used for canonical URLs + sitemap.xml)
export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') })],
});
