import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'.',testMatch:'browser.spec.mjs',fullyParallel:false,
 use:{baseURL:'http://127.0.0.1:3000',browserName:'chromium'},
 webServer:{command:'npm run start',url:'http://127.0.0.1:3000',timeout:60000,reuseExistingServer:false}
});
