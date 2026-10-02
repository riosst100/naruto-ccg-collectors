import { expect, test } from "@playwright/test";
import { DEMO, loginWeb, PNG, registerFresh } from "./helpers";

test.describe("public catalog", () => {
  test("browse series and cards; drafts are hidden", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Naruto CCG", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Seri 1/ })).toBeVisible();
    await expect(page.getByText("Seri 5")).toHaveCount(0); // draft series

    await page.getByRole("link", { name: /Seri 1/ }).click();
    await expect(page).toHaveURL(/\/series\/naruto-ccg-series-1$/);
    await expect(page.getByRole("link", { name: "Naruto Uzumaki" }).first()).toBeVisible();
    await expect(page.getByText("Ujian Chunin")).toHaveCount(0); // draft card inside a published series

    expect((await request.get("/series/naruto-ccg-series-5")).status()).toBe(404);
    expect((await request.get("/cards/ujian-chunin-016-s1")).status()).toBe(404);
    expect((await request.get("/cards/boruto-uzumaki-001-s5")).status()).toBe(404); // published card of a draft series
  });

  test("card detail shows attributes", async ({ page }) => {
    await page.goto("/cards/naruto-uzumaki-001-s1");
    await expect(page.getByRole("heading", { name: "Naruto Uzumaki" })).toBeVisible();
    await expect(page.getByText("#001").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Atribut" })).toBeVisible();
    await expect(page.getByText("Chakra", { exact: true })).toBeVisible();
    await expect(page.getByText("Ilustrator", { exact: true })).toBeVisible();
  });

  test("anonymous add buttons lead to login", async ({ page }) => {
    await page.goto("/cards/naruto-uzumaki-001-s1");
    await page.getByRole("link", { name: "♡ Wishlist" }).click();
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe("wishlist & collection", () => {
  test("wishlist add / view / remove", async ({ page }) => {
    await registerFresh(page);
    await page.goto("/cards/sasuke-uchiha-002-s1");
    await page.getByRole("button", { name: "Tambah ke wishlist" }).click();
    await expect(page.getByRole("button", { name: "Hapus dari wishlist" })).toBeVisible();
    await page.goto("/wishlist");
    await expect(page.getByRole("link", { name: "Sasuke Uchiha" }).last()).toBeVisible();
    await page.getByRole("button", { name: "Hapus dari wishlist" }).click();
    await expect(page.getByText("Wishlist Anda masih kosong")).toBeVisible();
  });

  test("collection: add (quantity merges), edit, adjust, images, delete", async ({ page }) => {
    await registerFresh(page);
    await page.goto("/cards/naruto-uzumaki-001-s1");

    // add 3 with prices
    await page.getByRole("button", { name: "+ Koleksi" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Jumlah").fill("3");
    await dialog.getByLabel("Harga beli (per kartu)").fill("500");
    await dialog.getByLabel("Harga jual (per kartu)").fill("1000");
    await dialog.getByRole("button", { name: "Tambah ke koleksi" }).click();
    await expect(dialog).toBeHidden();

    // add 2 more: quantity becomes 5, not a second record
    await page.getByRole("button", { name: /\+ Koleksi/ }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Jumlah").fill("2");
    await dialog.getByRole("button", { name: "Tambah ke koleksi" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/collection");
    await expect(page.getByText("Kartu Unik", { exact: true }).locator("..")).toContainText("1");
    await expect(page.getByText("Total Kartu", { exact: true }).locator("..")).toContainText("5");
    await expect(page.getByText("Total Nilai Beli", { exact: true }).locator("..")).toContainText("2.500");
    await expect(page.getByText("Total Nilai Jual", { exact: true }).locator("..")).toContainText("5.000");
    await expect(page.locator('span[aria-label="Jumlah"]')).toHaveText("×5");

    // +/- buttons
    await page.getByRole("button", { name: "Kurangi satu" }).click();
    await expect(page.locator('span[aria-label="Jumlah"]')).toHaveText("×4");
    await page.getByRole("button", { name: "Tambah satu" }).click();
    await expect(page.locator('span[aria-label="Jumlah"]')).toHaveText("×5");

    // edit
    await page.getByRole("button", { name: "Ubah", exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Jumlah").fill("2");
    await dialog.getByLabel("Harga jual (per kartu)").fill("1.500");
    await dialog.getByLabel("Catatan").fill("Mint condition");
    await dialog.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("“Mint condition”")).toBeVisible();
    await expect(page.getByText("Total Nilai Jual", { exact: true }).locator("..")).toContainText("3.000");

    // non-image disguised as PNG is rejected
    await page.locator('input[type="file"]').setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<script>alert(1)</script>") });
    await page.getByRole("button", { name: /^Unggah/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "bukan gambar yang valid" })).toBeVisible();

    // valid upload: preview, stored under a generated name, served, deletable
    await page.locator('input[type="file"]').setInputFiles({ name: "my-card.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByAltText("Pratinjau my-card.png")).toBeVisible();
    await page.getByRole("button", { name: /^Unggah/ }).click();
    const img = page.getByAltText("Kartu milik Anda: Naruto Uzumaki");
    await expect(img).toBeVisible();
    const src = (await img.getAttribute("src"))!;
    expect(src).toMatch(/^\/uploads\/collections\/[^/]+\/[0-9a-f-]{36}\.png$/);
    expect((await page.request.get(src)).status()).toBe(200);
    await page.getByRole("button", { name: "Hapus gambar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
    await expect(img).toHaveCount(0);
    expect((await page.request.get(src)).status()).toBe(404);

    // delete item
    await page.getByRole("button", { name: "Hapus", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
    await expect(page.getByText("Koleksi Anda masih kosong")).toBeVisible();
  });

  test("seeded demo user has data", async ({ page }) => {
    await loginWeb(page, DEMO);
    await page.goto("/collection");
    await expect(page.getByText("Kartu Unik", { exact: true }).locator("..")).toContainText("4");
    await page.goto("/wishlist");
    await expect(page.getByRole("heading", { name: "Wishlist Saya" })).toBeVisible();
  });
});

test.describe("profile", () => {
  test("account menu, edit name, upload and remove photo, logout needs confirmation", async ({ page }) => {
    await registerFresh(page, "profil");
    const menu = page.getByRole("button", { name: "Menu akun" });

    await menu.click();
    await expect(page.getByRole("menuitem", { name: "Wishlist" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Koleksi" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Lihat profil" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { name: "Profil Saya" })).toBeVisible();

    await page.getByLabel("Nama lengkap").fill("Hinata Hyūga");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(menu).toContainText("Hinata Hyūga");

    // No photo yet: initials. Upload one: the header shows the image (served only to its owner).
    await expect(menu.locator("img")).toHaveCount(0);
    await page.locator('input[name="avatar"]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
    await expect(menu.locator("img")).toHaveCount(1);
    const src = await menu.locator("img").getAttribute("src");
    expect(src).toMatch(/^\/uploads\/avatars\//);
    expect((await page.request.get(src!)).status()).toBe(200);
    const anon = await page.context().browser()!.newContext();
    expect((await anon.request.get(new URL(src!, page.url()).href)).status()).toBe(404);
    await anon.close();

    await page.getByRole("button", { name: "Hapus foto" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Hapus foto" }).click();
    await expect(menu.locator("img")).toHaveCount(0);

    // Cancelling the logout dialog keeps the session.
    await menu.click();
    await page.getByRole("menuitem", { name: "Keluar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Batal" }).click();
    await expect(menu).toBeVisible();
    await menu.click();
    await page.getByRole("menuitem", { name: "Keluar" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Keluar" }).click();
    await expect(page.getByRole("link", { name: "Masuk" })).toBeVisible();
  });
});
