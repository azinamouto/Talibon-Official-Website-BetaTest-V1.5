import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');

  // Backend API URL for the dev server proxy.
  // In production the frontend is served by the same origin as the API (Vercel/Cloud Run),
  // so no proxy is needed. In development, the frontend (port 5173) proxies /api/* to
  // the NestJS backend (port 3000).
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Gemini API key is NOT a VITE_ variable so Vite won't expose it automatically.
      // Injecting here preserves the existing behaviour — review before production.
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // Proxy all /api/* requests to the NestJS backend during development.
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          // Do not rewrite the path — NestJS controllers are registered under /api/*
        },
      },
    },
  };
});
