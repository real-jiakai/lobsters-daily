import { defineConfig } from 'astro/config';
import UnoCSS from '@unocss/astro';

export default defineConfig({
  site: 'https://lobsters-daily.pages.dev',
  integrations: [UnoCSS({ injectReset: true })],
  output: 'static',
});
