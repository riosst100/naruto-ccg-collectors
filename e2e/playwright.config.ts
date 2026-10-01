import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const root = path.resolve(__dirname, "..");
// Isolated database + upload dir so e2e never touches development data.
const webPort = process.env.E2E_WEB_PORT ?? "3000";
const adminPort = process.env.E2E_ADMIN_PORT ?? "3001";
const e2eEnv = { DATABASE_URL: "file:./data/e2e.db", UPLOAD_DIR: "./uploads-e2e" };

// Playwright launches webServers BEFORE globalSetup, so the e2e database is prepared here (main process only).
if (!process.env.TEST_WORKER_INDEX && !process.env.E2E_DB_READY) {
  rmSync(path.join(root, "data", "e2e.db"), { force: true });
  rmSync(path.join(root, "uploads-e2e"), { recursive: true, force: true });
  mkdirSync(path.join(root, "data"), { recursive: true });
  const env = { ...process.env, ...e2eEnv };
  const script = path.join(root, "packages", "database", "scripts", "prisma.mjs");
  execFileSync(process.execPath, [script, "migrate", "deploy"], { cwd: root, env, stdio: "ignore" });
  execFileSync(process.execPath, [script, "db", "seed"], { cwd: root, env, stdio: "ignore" });
  process.env.E2E_DB_READY = "1"; // inherited by worker processes
}

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [["list"]],
  use: { channel: "msedge", baseURL: `http://localhost:${webPort}`, trace: "retain-on-failure" },
  webServer: [
    { command: `pnpm --filter @naruto-ccg/web exec next start -p ${webPort}`, cwd: root, url: `http://localhost:${webPort}`, env: e2eEnv, reuseExistingServer: false, timeout: 120_000 },
    { command: `pnpm --filter @naruto-ccg/admin exec next start -p ${adminPort}`, cwd: root, url: `http://localhost:${adminPort}/admin/login`, env: e2eEnv, reuseExistingServer: false, timeout: 120_000 },
  ],
});
