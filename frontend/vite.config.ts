import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { validateEnvironment } from './src/lib/envValidator';

export default defineConfig(({mode}) => {
  const env = { ...loadEnv(mode, __dirname, 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))) };
  const validation = validateEnvironment(env);
  if (!validation.isValid) {
    throw new Error('Invalid frontend configuration: ' + validation.issues.join(' '));
  }

  // Backend API URL for the dev server proxy.
  // In production the frontend is served by the same origin as the API (Vercel/Cloud Run),
  // so no proxy is needed. In development, the frontend (port 5173) proxies /api/* to
  // the NestJS backend (port 3000).
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      // AI features fail closed until a server-side endpoint is available.
      "process.env.GEMINI_API_KEY": "undefined",
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
