import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

import cookieconsent from './src/integrations/cookieconsent.js';
import cookieConsentConfig from './src/config/cookieconsent.js';

export default defineConfig({
  site: 'https://www.talem.eu',
  output: 'static',
  image: {
    domains: ['www.talem.eu'],
  },
  integrations: [
    tailwind(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
    cookieconsent(cookieConsentConfig),
  ],
});