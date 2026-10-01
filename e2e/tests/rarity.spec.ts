import { expect, test } from "@playwright/test";
import { ADMIN_URL, DEMO, loginAdmin, loginWeb } from "./helpers";


test("collection is grouped by rarity, highest first; admin can reorder and manage rarities", async ({ page, browser }) => {
  // ---- web: grouped + sorted (demo user owns Langka Rahasia, Ultra Langka, Super Langka x2) ----
  const web = await browser.newContext({ baseURL: `http://localhost:${process.env.E2E_WEB_PORT ?? "3000"}` });
  const wp = await web.newPage();
  await loginWeb(wp, DEMO);
  await wp.goto("/collection");
  const initial = await wp.getByRole("heading", { level: 2 }).allTextContents();
  expect(initial.map((t) => t.replace(/\d.*$/, "").trim())).toEqual(["Langka Rahasia", "Ultra Langka", "Super Langka"]);
  await expect(wp.getByRole("region", { name: "Kelangkaan Super Langka" }).getByRole("heading", { level: 3 })).toHaveCount(2);

  // ---- admin: ranking page ----
  await loginAdmin(page);
  await page.goto(`${ADMIN_URL}/rarities`);
  const rows = page.getByRole("row");
  await expect(rows.nth(1)).toContainText("Langka Rahasia");
  await expect(rows.nth(1)).toContainText("#1");
  await expect(page.getByRole("button", { name: "Naikkan Langka Rahasia" })).toBeDisabled();

  // move Super Langka above Ultra Langka => web order changes
  await page.getByRole("button", { name: "Naikkan Super Langka" }).click();
  await expect(page.getByRole("row", { name: /Super Langka/ })).toContainText("#2");
  await wp.reload();
  expect((await wp.getByRole("heading", { level: 2 }).allTextContents()).map((t) => t.replace(/\d.*$/, "").trim())).toEqual(["Langka Rahasia", "Super Langka", "Ultra Langka"]);
  // move back
  await page.getByRole("button", { name: "Turunkan Super Langka" }).click();
  await expect(page.getByRole("row", { name: /Super Langka/ })).toContainText("#3");

  // add / rename / delete
  await page.getByPlaceholder("mis. SSR").fill("SSR");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await expect(page.getByText("Kelangkaan ditambahkan")).toBeVisible();
  const ssr = page.getByRole("row", { name: /SSR/ });
  await expect(ssr).toContainText("0"); // no cards
  await ssr.getByRole("button", { name: "Ubah nama" }).click();
  await page.getByRole("dialog").getByLabel("Nama baru").fill("SSR+");
  await page.getByRole("dialog").getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("row", { name: /SSR\+/ })).toBeVisible();
  await page.getByRole("row", { name: /SSR\+/ }).getByRole("button", { name: "Hapus" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByRole("row", { name: /SSR\+/ })).toHaveCount(0);

  // a rarity that cards use cannot be deleted
  await page.getByRole("row", { name: /Umum/ }).first().getByRole("button", { name: "Hapus" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "dipakai" })).toBeVisible();
  await web.close();
});
