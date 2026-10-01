import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

export default function setup() {
  const root = path.resolve(__dirname, "../../..");
  rmSync(path.join(root, "data", "vitest.db"), { force: true });
  const env = { ...process.env, DATABASE_URL: "file:./data/vitest.db" };
  execFileSync(process.execPath, [path.join(root, "packages/database/scripts/prisma.mjs"), "migrate", "deploy"], { cwd: root, env, stdio: "ignore" });
}
