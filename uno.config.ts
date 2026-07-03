import { defineConfig, presetWind3 } from 'unocss';

export default defineConfig({
  presets: [
    presetWind3(),
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
