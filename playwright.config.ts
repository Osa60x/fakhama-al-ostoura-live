import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://gold.osa60x.workers.dev",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  }
});
