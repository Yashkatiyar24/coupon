import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Used for canonical URLs + sitemap.xml; update if a custom domain is attached.
export default defineConfig({
  build: { inlineStylesheets: 'always' },
  site: 'https://www.couponanddeals.com',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') && !page.includes('/go/') })],
});
