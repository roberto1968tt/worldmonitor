import { defineConfig } from 'vite';

const PORTA_API = process.env.EC_API_PORT ?? '5274';

export default defineConfig({
  server: {
    port: 5273,
    // Em producao a Vercel serve /api direto; em dev, scripts/dev-api.mjs.
    proxy: { '/api': { target: `http://localhost:${PORTA_API}`, changeOrigin: true } },
  },
  preview: {
    port: 5273,
    proxy: { '/api': { target: `http://localhost:${PORTA_API}`, changeOrigin: true } },
  },
  build: { outDir: 'dist', sourcemap: true },
});
