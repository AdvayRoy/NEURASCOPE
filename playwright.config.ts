import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "e2e/.results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: process.env.E2E_CHANNEL ?? "chrome",
    headless: process.env.E2E_HEADED ? false : true,
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mbp-14", use: { viewport: { width: 1512, height: 982 } } },
    { name: "mba-13", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { ORIANE_API_KEY: "", ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "" },
  },
});
