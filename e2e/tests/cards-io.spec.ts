import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";
import { ADMIN_URL, loginAdmin, WEB_URL } from "./helpers";

const HEADER = "card_name,card_number,card_series_number,card_rarity,card_images,card_type,card_status,card_description,card_slug,card_attributes";
const BASIC = "card_name,card_number,card_series_number,card_rarity,card_images"; // the data source's own format
const tag = () => Date.now().toString(36).toUpperCase();

async function openImport(page: import("@playwright/test").Page, file: { name: string; mimeType: string; buffer: Buffer }, publish = false) {
  await page.goto(`${ADMIN_URL}/cards`);
  await page.getByRole("button", { name: "Impor" }).click();
  await page.locator('input[type="file"]').setInputFiles(file);
  if (publish) await page.getByLabel(/Langsung publikasikan/).check();
  await page.getByRole("dialog").getByRole("button", { name: "Impor", exact: true }).click();
}
const csvFile = (text: string) => ({ name: "kartu.csv", mimeType: "text/csv", buffer: Buffer.from(text) });

test.describe("cards import / export", () => {
  test("export requires admin", async ({ request }) => {
    expect((await request.get(`${ADMIN_URL}/cards/export`)).status()).toBe(401);
  });

  test("export with no matching data yields only the header (csv and xlsx)", async ({ page }) => {
    await loginAdmin(page);
    const csv = await page.request.get(`${ADMIN_URL}/cards/export?format=csv&q=zzzz-tidak-ada`);
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-disposition"]).toContain(".csv");
    expect((await csv.text()).replace(/^﻿/, "").trim()).toBe(HEADER);

    const xlsx = await page.request.get(`${ADMIN_URL}/cards/export?q=zzzz-tidak-ada`);
    expect(xlsx.headers()["content-disposition"]).toContain(".xlsx");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await xlsx.body());
    const ws = wb.worksheets[0]!;
    expect(ws.rowCount).toBe(1);
    expect(ws.getRow(1).values).toEqual([undefined, ...HEADER.split(",")]);
  });

  test("export contains cards; filters apply", async ({ page }) => {
    await loginAdmin(page);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await (await page.request.get(`${ADMIN_URL}/cards/export`)).body());
    const ws = wb.worksheets[0]!;
    expect(ws.rowCount).toBeGreaterThan(50);
    const row = ws.getRow(2).values as unknown[];
    expect(String(row[3])).toMatch(/^S\d$/); // series code
    expect(String(row[2])).toMatch(/^\d{3}$/); // leading zeros preserved
    const count = async (qs: string) => (await (await page.request.get(`${ADMIN_URL}/cards/export?format=csv&${qs}`)).text()).trim().split(/\r?\n/).length;
    expect(await count("rarity=Langka")).toBeLessThan(await count(""));
  });

  test("csv import in the source format: creates series + cards, remote images, updates, atomic errors", async ({ page, browser }) => {
    await loginAdmin(page);
    const code = `T${tag()}`;
    const url = (n: string) => `https://kayoufun.id/cardlist/storage/cards/webp/${n}.webp`;

    // invalid: bad image URL on row 3 => nothing saved
    const bad = `${BASIC}\nYashamaru,NRSA02-SE-001L5,${code},SE,${url("a")}\nGaara,NRSA02-SE-002L5,${code},SE,ftp://x/y.webp\n`;
    await openImport(page, csvFile(bad));
    await expect(page.getByRole("dialog")).toContainText("Impor dibatalkan");
    await expect(page.getByRole("dialog")).toContainText("Baris 3");

    // valid (draft)
    const good = `${BASIC}\nYashamaru,NRSA02-SE-001L5,${code},SE,${url("nrsa02-se-001")}\nGaara,NRSA02-SE-002L5,${code},SE,${url("nrsa02-se-002")}\nPromo Card,NRIE-PR-002,${code},PR,\n`;
    await openImport(page, csvFile(good));
    await expect(page.getByText("3 kartu baru, 0 diperbarui")).toBeVisible();
    await expect(page.getByText("1 seri baru dibuat")).toBeVisible();

    await page.goto(`${ADMIN_URL}/cards?q=${encodeURIComponent("Yashamaru")}`);
    const row = page.getByRole("row", { name: /Yashamaru/ });
    await expect(row).toContainText("NRSA02-SE-001L5");
    await expect(row).toContainText("SE");
    await expect(row).toContainText("Draf");
    await expect(row.locator("img")).toHaveAttribute("src", url("nrsa02-se-001")); // remote image URL used as is

    // series was auto-created with the code, as draft
    await page.goto(`${ADMIN_URL}/series?q=${encodeURIComponent(code)}`);
    await expect(page.getByRole("row", { name: new RegExp(code) })).toContainText("Draf");

    // re-import with "publish": existing cards updated (not duplicated), now public
    await openImport(page, csvFile(good), true);
    await expect(page.getByText("0 kartu baru, 3 diperbarui")).toBeVisible();
    const pub = await browser.newContext({ baseURL: WEB_URL });
    const slug = `yashamaru-nrsa02-se-001l5-${code.toLowerCase()}`;
    // series stays draft (it was created as draft), so the card is not public yet
    expect((await pub.request.get(`/cards/${slug}`)).status()).toBe(404);

    // export round-trips the source columns
    const exp = await (await page.request.get(`${ADMIN_URL}/cards/export?format=csv&q=Yashamaru`)).text();
    expect(exp).toContain(`Yashamaru,NRSA02-SE-001L5,${code},SE,${url("nrsa02-se-001")}`);
    await pub.close();
  });

  test("new series is published when 'publish' is checked, and extra columns work", async ({ page, browser }) => {
    await loginAdmin(page);
    const code = `P${tag()}`;
    const text =
      `${HEADER}\n` + `Rock Lee,NRSA02-SE-004L5,${code},BP,,Jutsu,,"Deskripsi, dengan koma",,"Chakra: 3\nEfek: Ambil 1 kartu: bagus"\n`;
    await openImport(page, csvFile(text), true);
    await expect(page.getByText("1 kartu baru, 0 diperbarui")).toBeVisible();
    const pub = await browser.newContext({ baseURL: WEB_URL });
    const res = await pub.request.get(`/cards/rock-lee-nrsa02-se-004l5-${code.toLowerCase()}`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain("Efek");
    expect(html).toContain("Ambil 1 kartu: bagus");
    await pub.close();
  });

  test("xlsx import works", async ({ page }) => {
    await loginAdmin(page);
    const code = `X${tag()}`;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Kartu");
    ws.addRow(BASIC.split(","));
    ws.addRow(["Hinata Hyuga", "NRSA02-BP-001L4", code, "BP", "https://kayoufun.id/x.webp"]);
    ws.addRow(["Tanpa Kode Seri Nomor Angka", 7, code, "SE", ""]); // numeric card number
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    await openImport(page, { name: "kartu.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer });
    await expect(page.getByText("2 kartu baru, 0 diperbarui")).toBeVisible();
    await page.goto(`${ADMIN_URL}/cards?q=${encodeURIComponent("Hinata Hyuga")}`);
    await expect(page.getByRole("row", { name: /NRSA02-BP-001L4/ })).toContainText("BP");
  });
});
