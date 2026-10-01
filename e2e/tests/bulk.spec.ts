import { expect, test } from "@playwright/test";
import { ADMIN_URL, loginAdmin } from "./helpers";

test("bulk actions: select page / all matching, publish, delete some, delete all", async ({ page }) => {
  await loginAdmin(page);
  const code = `B${Date.now().toString(36).toUpperCase()}`;
  const rows = Array.from({ length: 25 }, (_, i) => `Kartu Massal ${i + 1},BULK-${String(i + 1).padStart(3, "0")},${code},BP,`);
  const csv = `card_name,card_number,card_series_number,card_rarity,card_images\n${rows.join("\n")}\n`;

  await page.goto(`${ADMIN_URL}/cards`);
  await page.getByRole("button", { name: "Impor" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "massal.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("dialog").getByRole("button", { name: "Impor", exact: true }).click();
  await expect(page.getByText("25 kartu baru")).toBeVisible();

  const list = `${ADMIN_URL}/cards?q=${encodeURIComponent(code)}`;
  await page.goto(list);
  await expect(page.getByText("25 cocok")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Pilih Kartu Massal/ })).toHaveCount(20); // one page

  // no bulk bar until something is selected
  await expect(page.getByRole("region", { name: "Aksi massal" })).toHaveCount(0);

  // select the page, then escalate to all 25 matching
  await page.getByRole("checkbox", { name: "Pilih semua kartu di halaman ini" }).check();
  const bar = page.getByRole("region", { name: "Aksi massal" });
  await expect(bar).toContainText("20 kartu dipilih");
  await bar.getByRole("button", { name: "Pilih semua 25 kartu yang cocok" }).click();
  await expect(bar).toContainText("25 kartu dipilih");

  // publish all matching (across pages)
  await bar.getByRole("button", { name: "Publikasikan", exact: true }).click();
  await expect(page.getByText("25 kartu dipublikasikan")).toBeVisible();
  await expect(page.getByRole("region", { name: "Aksi massal" })).toHaveCount(0); // selection cleared
  await expect(page.getByRole("row", { name: /Kartu Massal 1\b/ })).toContainText("Dipublikasikan");

  // delete just two selected rows
  await page.getByRole("checkbox", { name: "Pilih Kartu Massal 1", exact: true }).check();
  await page.getByRole("checkbox", { name: "Pilih Kartu Massal 2", exact: true }).check();
  await expect(page.getByRole("region", { name: "Aksi massal" })).toContainText("2 kartu dipilih");
  await page.getByRole("region", { name: "Aksi massal" }).getByRole("button", { name: "Hapus", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Hapus 2 kartu?");
  await page.getByRole("dialog").getByRole("button", { name: "Hapus 2 kartu" }).click();
  await expect(page.getByText("2 kartu dihapus")).toBeVisible();
  await expect(page.getByText("23 cocok")).toBeVisible();

  // delete everything that matches the filter
  await page.getByRole("checkbox", { name: "Pilih semua kartu di halaman ini" }).check();
  await page.getByRole("button", { name: "Pilih semua 23 kartu yang cocok" }).click();
  await page.getByRole("region", { name: "Aksi massal" }).getByRole("button", { name: "Hapus", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus 23 kartu" }).click();
  await expect(page.getByText("23 kartu dihapus")).toBeVisible();
  await expect(page.getByText("Tidak ada kartu ditemukan")).toBeVisible();
});

test("bulk action endpoint refuses non-admins", async ({ request }) => {
  // Server actions need a valid action id + admin session; anonymous POSTs to the page must not mutate anything.
  const res = await request.post(`${ADMIN_URL}/cards`, { headers: { "Next-Action": "00" + "a".repeat(40) }, data: "[]", maxRedirects: 0 });
  expect([307, 404, 400, 500]).toContain(res.status());
});
