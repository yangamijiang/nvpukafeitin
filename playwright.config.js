import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.TEST_SETUP_KEY ||= randomBytes(32).toString('hex');
process.env.TEST_DATABASE_DIR ||= mkdtempSync(join(tmpdir(),'komorebi-e2e-'));
export default defineConfig({
 testDir:'./tests',testMatch:'**/*.spec.js',workers:1,fullyParallel:false,
 use:{baseURL:'http://127.0.0.1:5174',launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']},headless:true},
 webServer:{command:'node server/dev.js',url:'http://127.0.0.1:5174/api/health',reuseExistingServer:false,env:{PORT:'3101',VITE_PORT:'5174',APP_ORIGIN:'http://127.0.0.1:5174',DATABASE_PATH:join(process.env.TEST_DATABASE_DIR,'site.sqlite'),ADMIN_SETUP_KEY:process.env.TEST_SETUP_KEY}}
});
