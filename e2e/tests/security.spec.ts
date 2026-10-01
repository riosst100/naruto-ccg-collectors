import { expect, test } from "@playwright/test";
import { ADMIN_URL, DEMO, loginAdmin, loginWeb, PNG, registerFresh, WEB_URL } from "./helpers";

test("collection photos are private to their owner (admins can see them); no path traversal", async ({ browser }) => {
  // User A registers, adds a card, uploads a photo
  const a = await browser.newContext({ baseURL: WEB_URL });
  const pa = await a.newPage();
  const alice = await registerFresh(pa, "alice");
  await pa.goto("/cards/naruto-uzumaki-001-s1");
  await pa.getByRole("button", { name: "+ Koleksi" }).click();
  await pa.getByRole("dialog").getByRole("button", { name: "Tambah ke koleksi" }).click();
  await expect(pa.getByRole("dialog")).toBeHidden();
  await pa.goto("/collection");
  await pa.locator('input[type="file"]').setInputFiles({ name: "x.png", mimeType: "image/png", buffer: PNG });
  await pa.getByRole("button", { name: /^Unggah/ }).click();
  const src = (await pa.getByAltText("Kartu milik Anda: Naruto Uzumaki").getAttribute("src"))!;
  expect((await pa.request.get(src)).status()).toBe(200);

  // anonymous: 404
  const anon = await browser.newContext({ baseURL: WEB_URL });
  expect((await anon.request.get(src)).status()).toBe(404);

  // user B (seeded demo user): 404 for the file, and A's data is not on B's page
  const b = await browser.newContext({ baseURL: WEB_URL });
  const pb = await b.newPage();
  await loginWeb(pb, DEMO);
  expect((await pb.request.get(src)).status()).toBe(404);
  await pb.goto("/collection");
  await expect(pb.getByAltText("Kartu milik Anda: Naruto Uzumaki")).toHaveCount(0);
  expect(await pb.content()).not.toContain(alice.name);

  // path traversal attempts
  expect((await anon.request.get("/uploads/..%2f..%2f.env")).status()).toBe(404);
  expect((await anon.request.get("/uploads/collections/../../.env")).status()).toBe(404);
  expect((await anon.request.get("/uploads/catalog/..%5c..%5c.env")).status()).toBe(404);

  // admin can see it through the admin uploads route
  const adm = await browser.newContext();
  const pad = await adm.newPage();
  await loginAdmin(pad);
  await expect(pad.getByRole("heading", { name: "Dasbor" })).toBeVisible();
  expect((await pad.request.get(`${ADMIN_URL}${src}`)).status()).toBe(200);
  await Promise.all([a.close(), b.close(), anon.close(), adm.close()]);
});
