import { defineConfig, devices } from '@playwright/test'

/** End-to-end tests against the real API (Backend/tests/e2e-server.ts uses an in-memory MongoDB). */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    { command: 'npx tsx tests/e2e-server.ts', cwd: '../Backend', url: 'http://localhost:5055/health', timeout: 180_000, reuseExistingServer: false },
    { command: 'npx vite --port 5174 --strictPort', url: 'http://localhost:5174', env: { VITE_API_BASE_URL: 'http://localhost:5055' }, timeout: 60_000, reuseExistingServer: false },
  ],
})
