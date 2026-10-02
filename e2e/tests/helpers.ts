import { expect, type Page } from "@playwright/test";

export const ADMIN = { email: "admin@naruto-ccg.local", password: "Admin#12345" };
export const DEMO = { email: "user@naruto-ccg.local", password: "User#12345" };
export const WEB_PORT = process.env.E2E_WEB_PORT ?? "3000";
export const ADMIN_PORT = process.env.E2E_ADMIN_PORT ?? "3001";
export const WEB_URL = `http://localhost:${WEB_PORT}`;
export const ADMIN_URL = `http://localhost:${ADMIN_PORT}/admin`;

// 1x1 PNG
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

export const unique = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export async function loginWeb(page: Page, creds: { email: string; password: string }, remember = true) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Kata sandi").fill(creds.password);
  const box = page.getByLabel("Ingat saya");
  if (remember) await box.check();
  else await box.uncheck();
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByRole("button", { name: "Menu akun" })).toBeVisible();
}

export async function loginAdmin(page: Page, creds: { email: string; password: string } = ADMIN, expectSuccess = true) {
  await page.goto(`${ADMIN_URL}/login`);
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Kata sandi").fill(creds.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  if (expectSuccess) await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
}

export async function registerFresh(page: Page, prefix = "collector") {
  const name = unique(prefix);
  await page.goto("/register");
  await page.getByLabel("Nama pengguna").fill(name);
  await page.getByLabel("Email").fill(`${name}@example.com`);
  await page.locator('input[name="password"]').fill("Shinobi123");
  await page.getByLabel("Konfirmasi kata sandi").fill("Shinobi123");
  await page.getByRole("button", { name: "Buat akun" }).click();
  await expect(page.getByRole("button", { name: "Menu akun" })).toContainText(name);
  return { name, email: `${name}@example.com`, password: "Shinobi123" };
}

/** Logs out through the header account menu and its confirmation dialog. */
export async function logoutWeb(page: Page) {
  await page.getByRole("button", { name: "Menu akun" }).click();
  await page.getByRole("menuitem", { name: "Keluar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Keluar" }).click();
}
