import { expect, test } from "@playwright/test";
import { DEMO, loginWeb, registerFresh, unique, WEB_URL, WEB_PORT } from "./helpers";

test.describe("authentication", () => {
  test("register, persistent session survives browser restart, logout kills it server-side", async ({ page, context }) => {
    const user = await registerFresh(page, "ninja");

    // Cookie is HttpOnly, SameSite=Lax, persistent. Nothing in localStorage.
    const cookie = (await context.cookies()).find((c) => c.name === "ccg_session")!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("Lax");
    expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 60 * 60 * 24 * 20);
    expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe("{}");

    // "Close and reopen the browser": a new context seeded only with persistent cookies.
    const state = await context.storageState();
    const reopened = await context.browser()!.newContext({ storageState: state, baseURL: WEB_URL });
    const p2 = await reopened.newPage();
    await p2.goto("/");
    await expect(p2.getByText(`Halo, ${user.name}`)).toBeVisible();
    await p2.reload();
    await expect(p2.getByText(`Halo, ${user.name}`)).toBeVisible();

    // Logout deletes the DB session: the copied cookie is dead too.
    await page.getByRole("button", { name: "Keluar" }).click();
    await expect(page.getByRole("link", { name: "Masuk" })).toBeVisible();
    await p2.reload();
    await expect(p2.getByRole("link", { name: "Masuk" })).toBeVisible();
    await reopened.close();

    await loginWeb(page, user);
  });

  test("duplicate email and weak password are rejected; form values are kept", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Nama pengguna").fill("dupe");
    await page.getByLabel("Email").fill(DEMO.email);
    await page.locator('input[name="password"]').fill("Shinobi123");
    await page.getByLabel("Konfirmasi kata sandi").fill("Shinobi123");
    await page.getByRole("button", { name: "Buat akun" }).click();
    await expect(page.getByText("sudah terdaftar").first()).toBeVisible();
    await expect(page.getByLabel("Nama pengguna")).toHaveValue("dupe");

    await page.getByLabel("Email").fill(unique("x") + "@example.com");
    await page.locator('input[name="password"]').fill("short");
    await page.getByLabel("Konfirmasi kata sandi").fill("short");
    await page.getByRole("button", { name: "Buat akun" }).click();
    await expect(page.getByText("Minimal 8 karakter").first()).toBeVisible();
  });

  test("invalid credentials show one generic error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Kata sandi").fill("WrongPassword1");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Email atau kata sandi salah.")).toBeVisible();
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Email atau kata sandi salah.")).toBeVisible();
  });

  test("without remember me the cookie is a session cookie; wishlist/koleksi show a login prompt when logged out", async ({ page, context }) => {
    await page.goto("/collection");
    await expect(page.getByText("Silakan daftar atau masuk untuk menambahkan koleksi Anda")).toBeVisible();
    await expect(page.getByRole("link", { name: "Wishlist" })).toBeVisible(); // menu stays visible
    await page.goto("/wishlist");
    await expect(page.getByText("Silakan daftar atau masuk untuk menambahkan koleksi Anda")).toBeVisible();
    await loginWeb(page, DEMO, false);
    await page.goto("/collection");
    await expect(page.getByRole("heading", { name: "Koleksi Saya" })).toBeVisible();
    const cookie = (await context.cookies()).find((c) => c.name === "ccg_session")!;
    expect(cookie.expires).toBe(-1);
  });

  test("open redirect via next param is ignored", async ({ page }) => {
    await page.goto("/login?next=//evil.example.com");
    await page.getByLabel("Email").fill(DEMO.email);
    await page.getByLabel("Kata sandi").fill(DEMO.password);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByRole("button", { name: "Keluar" })).toBeVisible();
    expect(new URL(page.url()).host).toBe(`localhost:${WEB_PORT}`);
  });
});
