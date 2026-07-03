import { defineConfig } from 'astro/config';
import UnoCSS from '@unocss/astro';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://lobsters.gujiakai.top',
  integrations: [UnoCSS({ injectReset: true }), sitemap()],
  output: 'static',
});
