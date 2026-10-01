import { expect, test } from "@playwright/test";
import { ADMIN, ADMIN_URL, DEMO, loginAdmin, loginWeb, registerFresh, WEB_URL } from "./helpers";

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

test.describe("admin access", () => {
  test("anonymous and non-admin users are blocked server-side", async ({ page, request }) => {
    for (const p of ["", "/series", "/cards", "/users", "/collections", "/wishlists", "/settings", "/series/create"]) {
      const res = await request.get(`${ADMIN_URL}${p}`, { maxRedirects: 0 });
      expect(res.status(), p).toBe(307);
      expect(res.headers().location).toContain("/admin/login");
    }
    // a normal user's web session does not open the admin site
    await loginWeb(page, DEMO);
    await page.goto(ADMIN_URL);
    await expect(page).toHaveURL(/\/admin\/login/);
    // and normal-user credentials are refused with the same generic error
    await loginAdmin(page, DEMO, false);
    await expect(page.getByText("Email atau kata sandi salah.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
    expect((await request.get(`${ADMIN_URL}/uploads/catalog/seed-card-naruto-uzumaki-001-s1.svg`)).status()).toBe(404);
  });

  test("admin cookie is an HttpOnly session cookie", async ({ page, context }) => {
    await loginAdmin(page);
    await expect(page.getByRole("heading", { name: "Dasbor" })).toBeVisible();
    const c = (await context.cookies()).find((x) => x.name === "ccg_admin_session")!;
    expect(c.httpOnly).toBe(true);
    expect(c.expires).toBe(-1);
  });
});

test.describe("admin management", () => {
  test("dashboard stats; series & card lifecycle; publish visibility", async ({ page, browser }) => {
    await loginAdmin(page);
    for (const label of ["Pengguna", "Seri", "Kartu", "Item Wishlist", "Item Koleksi"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }

    // ---- create series (draft) with auto slug ----
    const sname = `Test Series ${Date.now().toString(36)}`;
    const slug = slugOf(sname);
    await page.goto(`${ADMIN_URL}/series/create`);
    await page.locator('input[name="name"]').fill(sname);
    await expect(page.getByLabel("Slug")).toHaveValue(slug);
    await page.getByLabel("Deskripsi").fill("E2E series");
    await page.getByRole("button", { name: "Buat seri" }).click();
    await expect(page).toHaveURL(`${ADMIN_URL}/series`);
    await page.goto(`${ADMIN_URL}/series?q=${encodeURIComponent(sname)}`);
    const row = page.getByRole("row", { name: new RegExp(sname) });
    await expect(row).toContainText("Draf");

    const pub = await browser.newContext({ baseURL: WEB_URL });
    expect((await pub.request.get(`/series/${slug}`)).status()).toBe(404);

    // duplicate slug rejected
    await page.goto(`${ADMIN_URL}/series/create`);
    await page.locator('input[name="name"]').fill("Dupe");
    await page.getByLabel("Slug").fill("naruto-ccg-series-1");
    await page.getByRole("button", { name: "Buat seri" }).click();
    await expect(page.getByText("Slug ini sudah digunakan.").first()).toBeVisible();

    // publish
    await page.goto(`${ADMIN_URL}/series?q=${encodeURIComponent(sname)}`);
    await row.getByRole("button", { name: "Publikasikan" }).click();
    await expect(row).toContainText("Dipublikasikan");
    expect((await pub.request.get(`/series/${slug}`)).status()).toBe(200);

    // edit
    await row.getByRole("link", { name: "Ubah" }).click();
    await page.getByLabel("Deskripsi").fill("Edited description");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Seri disimpan")).toBeVisible();

    // ---- create card with attributes ----
    const cname = `Test Card ${Date.now().toString(36)}`;
    const cslug = slugOf(cname);
    await page.goto(`${ADMIN_URL}/cards/create`);
    await page.getByLabel("Seri").selectOption({ label: sname });
    await page.getByLabel("Nomor kartu").fill("777");
    await page.getByLabel("Nama", { exact: true }).fill(cname);
    await page.getByLabel("Kelangkaan").fill("Langka");
    await page.getByLabel("Tipe kartu").selectOption("Jutsu");
    await page.getByRole("button", { name: "+ Tambah atribut" }).click();
    await page.getByRole("button", { name: "+ Tambah atribut" }).click();
    await page.getByLabel("Atribut 1 nama").fill("Chakra");
    await page.getByLabel("Atribut 1 nilai").fill("3");
    await page.getByLabel("Atribut 2 nama").fill("Serangan");
    await page.getByLabel("Atribut 2 nilai").fill("4");
    await page.getByRole("button", { name: "+ Tambah atribut" }).click();
    await page.getByLabel("Atribut 3 nama").fill("Efek");
    await page.getByLabel("Atribut 3 nilai").fill("Draw a card");
    // reorder: Effect to the top; delete Attack (now at index 2)
    await page.getByTitle("Naik").nth(2).click();
    await page.getByTitle("Naik").nth(1).click();
    await page.getByTitle("Hapus atribut").nth(2).click();
    await page.getByRole("button", { name: "Buat kartu" }).click();
    await expect(page).toHaveURL(`${ADMIN_URL}/cards`);

    expect((await pub.request.get(`/cards/${cslug}`)).status()).toBe(404); // still a draft

    await page.goto(`${ADMIN_URL}/cards?q=${encodeURIComponent(cname)}`);
    const crow = page.getByRole("row", { name: new RegExp(cname) });
    await expect(crow).toContainText("#777");
    await crow.getByRole("button", { name: "Publikasikan" }).click();
    await expect(crow).toContainText("Dipublikasikan");

    const html = await (await pub.request.get(`/cards/${cslug}`)).text();
    expect(html).toContain(cname);
    expect(html.indexOf("Efek")).toBeGreaterThan(-1);
    expect(html.indexOf("Efek")).toBeLessThan(html.indexOf("Chakra")); // order preserved
    expect(html).not.toContain(">Serangan<"); // deleted attribute is gone

    // ---- edit card ----
    await crow.getByRole("link", { name: "Ubah" }).click();
    await page.getByLabel("Kelangkaan").fill("Ultra Langka");
    await page.getByRole("button", { name: "+ Tambah atribut" }).click();
    await page.getByLabel("Atribut 3 nama").fill("Ilustrator");
    await page.getByLabel("Atribut 3 nilai").fill("E2E");
    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByText("Kartu disimpan")).toBeVisible();
    expect(await (await pub.request.get(`/cards/${cslug}`)).text()).toContain("Ilustrator");

    // delete dialog warns about the cascade and can be cancelled
    await page.goto(`${ADMIN_URL}/series?q=${encodeURIComponent(sname)}`);
    await row.getByRole("button", { name: "Hapus" }).click();
    await expect(page.getByRole("dialog")).toContainText("1 kartu di seri ini akan ikut dihapus");
    await page.getByRole("dialog").getByRole("button", { name: "Batal" }).click();
    await expect(row).toBeVisible();

    // unpublish hides the card; delete (nobody owns it => hard delete)
    await page.goto(`${ADMIN_URL}/cards?q=${encodeURIComponent(cname)}`);
    await crow.getByRole("button", { name: "Batalkan publikasi" }).click();
    await expect(crow).toContainText("Draf");
    expect((await pub.request.get(`/cards/${cslug}`)).status()).toBe(404);
    await crow.getByRole("button", { name: "Hapus" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
    await expect(page.getByText("Tidak ada kartu ditemukan")).toBeVisible();

    // now the empty series can go
    await page.goto(`${ADMIN_URL}/series?q=${encodeURIComponent(sname)}`);
    await row.getByRole("button", { name: "Hapus" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
    await expect(page.getByText("Tidak ada seri yang cocok")).toBeVisible();
    await pub.close();
  });

  test("deleting a card that users own archives it and keeps their collection", async ({ page, browser }) => {
    await loginAdmin(page);
    const sname = `Archive Series ${Date.now().toString(36)}`;
    await page.goto(`${ADMIN_URL}/series/create`);
    await page.locator('input[name="name"]').fill(sname);
    await page.getByLabel("Status").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Buat seri" }).click();
    await expect(page).toHaveURL(`${ADMIN_URL}/series`);

    const cname = `Archive Card ${Date.now().toString(36)}`;
    await page.goto(`${ADMIN_URL}/cards/create`);
    await page.getByLabel("Seri").selectOption({ label: sname });
    await page.getByLabel("Nomor kartu").fill("001");
    await page.getByLabel("Nama", { exact: true }).fill(cname);
    await page.getByLabel("Status").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Buat kartu" }).click();
    await expect(page).toHaveURL(`${ADMIN_URL}/cards`);

    // a user collects it
    const ctx = await browser.newContext({ baseURL: WEB_URL });
    const web = await ctx.newPage();
    await registerFresh(web, "owner");
    await web.goto(`/cards/${slugOf(cname)}`);
    await web.getByRole("button", { name: "+ Koleksi" }).click();
    await web.getByRole("dialog").getByRole("button", { name: "Tambah ke koleksi" }).click();
    await expect(web.getByRole("dialog")).toBeHidden();
    await web.goto("/collection");
    await expect(web.getByRole("heading", { name: cname })).toBeVisible();

    // admin deletes the card => archived
    await page.goto(`${ADMIN_URL}/cards?q=${encodeURIComponent(cname)}`);
    await page.getByRole("row", { name: new RegExp(cname) }).getByRole("button", { name: "Hapus" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
    await expect(page.getByText("Tidak ada kartu ditemukan")).toBeVisible();

    // gone from the catalog, still in the owner's collection (flagged)
    expect((await ctx.request.get(`/cards/${slugOf(cname)}`)).status()).toBe(404);
    await web.goto("/collection");
    await expect(web.getByRole("heading", { name: cname })).toBeVisible();
    await expect(web.getByText("Tidak lagi ada di katalog")).toBeVisible();
    await ctx.close();
  });

  test("deleting a series deletes all its cards and owner copies after confirmation", async ({ page, browser }) => {
    await loginAdmin(page);
    const sname = `Cascade Series ${Date.now().toString(36)}`;
    await page.goto(`${ADMIN_URL}/series/create`);
    await page.locator('input[name="name"]').fill(sname);
    await page.getByLabel("Status").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Buat seri" }).click();
    await expect(page).toHaveURL(`${ADMIN_URL}/series`);
    const cname = `Cascade Card ${Date.now().toString(36)}`;
    await page.goto(`${ADMIN_URL}/cards/create`);
    await page.locator('select[name="seriesId"]').selectOption({ label: sname });
    await page.getByLabel("Nomor kartu").fill("001");
    await page.locator('input[name="name"]').fill(cname);
    await page.getByLabel("Status").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Buat kartu" }).click();
    await expect(page).toHaveURL(`${ADMIN_URL}/cards`);

    const ctx = await browser.newContext({ baseURL: WEB_URL });
    const web = await ctx.newPage();
    await registerFresh(web, "cascade");
    await web.goto(`/cards/${slugOf(cname)}`);
    await web.getByRole("button", { name: "+ Koleksi" }).click();
    await web.getByRole("dialog").getByRole("button", { name: "Tambah ke koleksi" }).click();
    await expect(web.getByRole("dialog")).toBeHidden();

    await page.goto(`${ADMIN_URL}/series?q=${encodeURIComponent(sname)}`);
    const row = page.getByRole("row", { name: new RegExp(sname) });
    await row.getByRole("button", { name: "Hapus" }).click();
    await expect(page.getByRole("dialog")).toContainText("1 item koleksi milik pengguna");
    await page.getByRole("dialog").getByRole("button", { name: "Hapus seri dan semua kartunya" }).click();
    await expect(page.getByText("Tidak ada seri yang cocok")).toBeVisible();

    await page.goto(`${ADMIN_URL}/cards?q=${encodeURIComponent(cname)}`);
    await expect(page.getByText("Tidak ada kartu ditemukan")).toBeVisible();
    expect((await ctx.request.get(`/cards/${slugOf(cname)}`)).status()).toBe(404);
    await web.goto("/collection");
    await expect(web.getByText("Koleksi Anda masih kosong")).toBeVisible();
    await ctx.close();
  });

  test("users: search, view, read-only collection & wishlist, cross-user search", async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${ADMIN_URL}/users`);
    await page.getByPlaceholder("Nama pengguna atau email…").fill("demo_user");
    await page.getByRole("button", { name: "Cari" }).click();
    const row = page.getByRole("row", { name: /demo_user/ });
    await expect(row).toContainText(DEMO.email);
    expect(await page.content()).not.toMatch(/scrypt\$/); // no password hashes anywhere
    await row.getByRole("link", { name: "Lihat", exact: true }).click();
    await expect(page.getByRole("heading", { name: "demo_user" })).toBeVisible();
    await expect(page.getByText("Informasi pengguna")).toBeVisible();
    const userUrl = page.url();

    await page.goto(`${userUrl}/collection`);
    await expect(page.getByText("Hanya baca").first()).toBeVisible();
    await expect(page.getByRole("row", { name: /Naruto Uzumaki/ })).toContainText("500");
    await expect(page.getByRole("button", { name: /Hapus|Ubah|Simpan|Hapus/ })).toHaveCount(0);

    await page.goto(`${userUrl}/wishlist`);
    await expect(page.getByText("Hanya baca").first()).toBeVisible();
    await expect(page.getByRole("row").nth(1)).toBeVisible();

    await page.goto(`${ADMIN_URL}/collections?q=demo_user`);
    await expect(page.getByRole("row", { name: /demo_user/ }).first()).toBeVisible();
    await page.goto(`${ADMIN_URL}/wishlists?q=demo_user`);
    await expect(page.getByRole("row", { name: /demo_user/ }).first()).toBeVisible();
    await page.goto(`${ADMIN_URL}/collections?q=zzzz-no-such`);
    await expect(page.getByText("Tidak ada item koleksi ditemukan")).toBeVisible();
  });

  test("disabling a user kills their session; admin cannot demote/disable themself", async ({ page, browser }) => {
    const ctx = await browser.newContext({ baseURL: WEB_URL });
    const web = await ctx.newPage();
    const victim = await registerFresh(web, "victim");

    await loginAdmin(page);
    await page.goto(`${ADMIN_URL}/users?q=${victim.name}`);
    await page.getByRole("row", { name: new RegExp(victim.name) }).getByRole("link", { name: "Lihat", exact: true }).click();
    await page.getByRole("button", { name: "Nonaktifkan pengguna" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Nonaktifkan" }).click();
    await expect(page.getByText("Pengguna dinonaktifkan")).toBeVisible();

    await web.reload();
    await expect(web.getByRole("link", { name: "Masuk" })).toBeVisible(); // session invalidated
    await web.goto("/login");
    await web.getByLabel("Email").fill(victim.email);
    await web.getByLabel("Kata sandi").fill(victim.password);
    await web.getByRole("button", { name: "Masuk" }).click();
    await expect(web.getByText("Email atau kata sandi salah.")).toBeVisible();
    await ctx.close();

    await page.goto(`${ADMIN_URL}/users?q=${ADMIN.email}`);
    await page.getByRole("row", { name: /admin/ }).getByRole("link", { name: "Lihat", exact: true }).click();
    await expect(page.getByRole("button", { name: "Anda tidak dapat mengubah peran sendiri" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Anda tidak dapat menonaktifkan akun sendiri" })).toBeDisabled();
  });
});
