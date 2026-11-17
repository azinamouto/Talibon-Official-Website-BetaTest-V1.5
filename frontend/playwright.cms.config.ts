import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,testMatch:['cms-uploads.spec.ts','media.spec.ts','public-content.spec.ts'],
  outputDir:'./test-results/cms',use:{...base.use,baseURL:'http://127.0.0.1:53864'},
  webServer:{...base.webServer,command:'npm run dev -- --host 127.0.0.1 --port 53864 --strictPort',url:'http://127.0.0.1:53864'}});
