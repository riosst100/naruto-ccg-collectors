// Smoke test against the running docker stack: node e2e/docker-smoke.mjs [webPort] [adminPort]
import { chromium } from "@playwright/test";

// Usage: node e2e/docker-smoke.mjs <webBase> [adminBase]   e.g. http://naruto-ccg.local:8080  (admin defaults to <webBase>/admin)
const web = process.argv[2] ?? "http://localhost:3000";
const admin = process.argv[3] ?? `${web}/admin`;
// Lets the check work before the hosts entry exists: resolve the .local name to loopback inside the browser only.
const browser = await chromium.launch({ channel: "msedge", args: ["--host-resolver-rules=MAP naruto-ccg.local 127.0.0.1"] });
const out = [];
try {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await ctx.newPage();

  // user site: register (HttpOnly cookie over plain http), add to wishlist, persistent cookie
  const name = `docker${Date.now().toString(36)}`;
  await page.goto(`${web}/register`);
  await page.getByLabel("Nama pengguna").fill(name);
  await page.getByLabel("Email").fill(`${name}@example.com`);
  await page.locator('input[name="password"]').fill("Shinobi123");
  await page.getByLabel("Konfirmasi kata sandi").fill("Shinobi123");
  await page.getByRole("button", { name: "Buat akun" }).click();
  await page.getByText(`Halo, ${name}`).waitFor({ timeout: 15000 });
  const c = (await ctx.cookies()).find((x) => x.name === "ccg_session");
  out.push(`register+login ok; cookie httpOnly=${c.httpOnly} secure=${c.secure}`);
  await page.goto(`${web}/collection`);
  await page.getByRole("heading", { name: "Koleksi Saya" }).waitFor();
  out.push("collection page ok");

  // admin site
  const a = await browser.newContext({ ignoreHTTPSErrors: true });
  const ap = await a.newPage();
  await ap.goto(`${admin}/login`);
  await ap.getByLabel("Email").fill("admin@naruto-ccg.local");
  await ap.getByLabel("Kata sandi").fill("Admin#12345");
  await ap.getByRole("button", { name: "Masuk" }).click();
  const ok = await ap.getByRole("heading", { name: "Dasbor" }).waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  out.push(ok ? "admin login ok" : "admin login FAILED (password may differ in imported data)");
  if (ok) {
    out.push("dashboard: " + (await ap.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 160));
    await ap.goto(`${admin}/cards`);
    out.push("cards list: " + (await ap.getByText(/cocok|total/).first().innerText()));
  }
} finally {
  await browser.close();
  console.log(out.join("\n"));
}
