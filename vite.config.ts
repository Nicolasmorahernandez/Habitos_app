import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Hábitos',
        short_name: 'Hábitos',
        description: 'Seguimiento personal de hábitos',
        theme_color: '#0f1115',
        background_color: '#0f1115',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    // Zona horaria fijada: core/dates depende de la hora local y sus pruebas
    // solo distinguen local de UTC bajo un desfase conocido y no nulo.
    // Europe/Madrid es UTC+2 en agosto, la fecha usada en las pruebas.
    env: { TZ: 'Europe/Madrid' },
  },
});
