import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
