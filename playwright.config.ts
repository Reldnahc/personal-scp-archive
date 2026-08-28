import { defineConfig } from '@playwright/test';

const basePath = `/${(process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '')}`.replace('//', '/');
const normalizedBase = basePath === '/' ? '/' : `${basePath}/`;
const previewUrl = `http://127.0.0.1:4173${normalizedBase}`;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: previewUrl,
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
