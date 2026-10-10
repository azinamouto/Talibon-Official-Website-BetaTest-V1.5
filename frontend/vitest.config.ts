import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:5173' } },
    include: ['test/react/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/react/setup.ts'],
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      // Sprint 5 feature surface, including unimported files; this is not full-app coverage.
      include: [
        'src/components/{MunicipalChatbot,InteractiveMap,PublicMapCanvas,LocationMap}.tsx',
        'src/hooks/{useMunicipalChat,usePublicResource}.ts',
        'src/services/{municipalAssistant,mapLocations}.ts',
        'src/pages/TourismMapPage.tsx', 'src/lib/mode.ts',
      ],
      thresholds: { statements: 85, branches: 85, functions: 85, lines: 85 },
    },
  },
});
