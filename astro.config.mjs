import { defineConfig } from 'astro/config';
import UnoCSS from '@unocss/astro';

export default defineConfig({
  site: 'https://lobsters.gujiakai.top',
  integrations: [UnoCSS({ injectReset: true })],
  output: 'static',
});
