import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'cd ../api && pnpm dev',
      url: 'http://localhost:3001/api/v1/health',
      timeout: 60_000,
      reuseExistingServer: true,
    },
    {
      command: 'pnpm exec vite preview --port 4173',
      url: 'http://localhost:4173',
      timeout: 30_000,
      reuseExistingServer: true,
    },
  ],
});
