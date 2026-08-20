import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import cookieconsent from './src/integrations/cookieconsent.js';
import cookieConsentConfig from './src/config/cookieconsent.js';

export default defineConfig({
  site: 'https://www.talem.eu',
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'file',
    inlineStylesheets: 'always', // Inline critical CSS dla lepszego FCP/LCP
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true, // Split CSS per page/component
      cssMinify: 'lightningcss',
    },
  },
  image: {
    domains: ['api.talem.eu'],
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
    cookieconsent(cookieConsentConfig),
  ],
});