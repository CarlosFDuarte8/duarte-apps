import { defineConfig } from "@playwright/test";

// Component rendering only: no app server, login or database connection.
export default defineConfig({
  testDir: ".",
  testMatch: "admin-theme.spec.ts",
  workers: 1,
  use: {
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
});
