// Runs the Prisma CLI with the repo-root .env loaded and a relative sqlite DATABASE_URL
// resolved against the repo root (the same rule the runtime client uses).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgDir = path.resolve(here, "..");
const root = path.resolve(pkgDir, "../..");

const envFile = path.join(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

let url = process.env.DATABASE_URL ?? "file:./data/dev.db";
if (url.startsWith("file:") && !path.isAbsolute(url.slice(5))) {
  const abs = path.resolve(root, url.slice(5));
  mkdirSync(path.dirname(abs), { recursive: true });
  url = `file:${abs}`;
}
process.env.DATABASE_URL = url;
// `prisma db seed` shells out to `tsx`; make sure local bins resolve even when not launched via pnpm.
process.env.PATH = [path.join(pkgDir, "node_modules", ".bin"), process.env.PATH].join(path.delimiter);

const bin = path.join(pkgDir, "node_modules", "prisma", "build", "index.js");
const res = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { stdio: "inherit", cwd: pkgDir, env: process.env });
process.exit(res.status ?? 1);
