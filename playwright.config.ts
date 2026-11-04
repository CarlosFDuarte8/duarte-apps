import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: [
    { command: "node e2e/supabase-fixture.mjs", port: 3101, reuseExistingServer: false },
    {
      command: process.env.VOLLEY_E2E_PRODUCTION === "1"
        ? "npm run start -- --port 3100" : "npm run dev -- --port 3100",
      url: "http://127.0.0.1:3100/volei",
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        VOLLEY_E2E: "1",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3101",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
        SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      },
    },
  ],
});
