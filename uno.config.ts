import { defineConfig, presetUno, presetTypography } from 'unocss';

export default defineConfig({
  presets: [
    presetUno(),
    presetTypography(),
  ],
  theme: {
    colors: {
      lobster: {
        red: '#ac130d',
        dark: '#1a1a2e',
        surface: '#16213e',
        accent: '#e94560',
        text: '#eee',
        muted: '#999',
      },
    },
  },
});
