import { beforeAll, describe, expect, it } from "vitest";
import {
  addCollectionImage,
  addToCollection,
  addToWishlist,
  adjustCollectionQuantity,
  createCard,
  createSeries,
  createSessionRecord,
  createUser,
  deleteCard,
  findActiveSession,
  getCardBySlug,
  getCards,
  getSeries,
  getSeriesBySlug,
  getUserCollection,
  getUserWishlist,
  hashPassword,
  removeCollectionImage,
  removeFromCollection,
  ServiceError,
  setCardStatus,
  setSeriesStatus,
  setUserRole,
  updateCollectionItem,
  verifyPassword,
} from "../src";

const write = { quantity: 1, buyPrice: 500, sellPrice: 1000, notes: null };
let alice: { id: string };
let bob: { id: string };
let admin: { id: string };
let seriesId: string;
let cardId: string;

beforeAll(async () => {
  const hash = await hashPassword("Password123");
  alice = await createUser({ username: "alice", email: "alice@t.dev", passwordHash: hash });
  bob = await createUser({ username: "bob", email: "bob@t.dev", passwordHash: hash });
  admin = await createUser({ username: "root", email: "root@t.dev", passwordHash: hash, role: "ADMIN" });
  const series = await createSeries({ name: "S", slug: "s", code: null, description: null, releaseDate: null, status: "DRAFT" }, null);
  seriesId = series.id;
  const card = await createCard(
    { seriesId, cardNumber: "001", name: "Card", slug: "card-1", description: null, rarity: "Umum", cardType: "Ninja", status: "DRAFT", attributes: [{ name: "Chakra", value: "3" }] },
    null,
  );
  cardId = card.id;
});

describe("passwords & sessions", () => {
  it("hashes with scrypt and verifies", async () => {
    const h = await hashPassword("Password123");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(h).not.toContain("Password123");
    expect(await verifyPassword("Password123", h)).toBe(true);
    expect(await verifyPassword("password123", h)).toBe(false);
  });

  it("rejects duplicate email", async () => {
    await expect(createUser({ username: "x", email: "alice@t.dev", passwordHash: "h" })).rejects.toBeInstanceOf(ServiceError);
  });

  it("expired and wrong-scope sessions are not active", async () => {
    await createSessionRecord({ userId: alice.id, tokenHash: "live", scope: "WEB", expiresAt: new Date(Date.now() + 60_000) });
    await createSessionRecord({ userId: alice.id, tokenHash: "old", scope: "WEB", expiresAt: new Date(Date.now() - 1000) });
    expect((await findActiveSession("live", "WEB"))?.user.email).toBe("alice@t.dev");
    expect(await findActiveSession("live", "ADMIN")).toBeNull(); // web token never opens an admin session
    expect(await findActiveSession("old", "WEB")).toBeNull();
    expect(await findActiveSession("nope", "WEB")).toBeNull();
    // user object never carries the hash
    expect((await findActiveSession("live", "WEB"))!.user).not.toHaveProperty("passwordHash");
  });
});

describe("draft content is not public", () => {
  it("hides draft series and cards, shows them once published", async () => {
    expect(await getSeriesBySlug("s")).toBeNull();
    expect((await getSeries()).find((s) => s.slug === "s")).toBeUndefined();
    expect(await getCardBySlug("card-1")).toBeNull();

    await setSeriesStatus(seriesId, "PUBLISHED");
    expect(await getSeriesBySlug("s")).not.toBeNull();
    expect(await getCardBySlug("card-1")).toBeNull(); // card still draft
    expect(await getCards({ seriesSlug: "s" })).toHaveLength(0);
    await expect(addToWishlist(alice.id, cardId)).rejects.toBeInstanceOf(ServiceError); // cannot wishlist a draft

    await setCardStatus(cardId, "PUBLISHED");
    expect((await getCardBySlug("card-1"))?.attributes).toHaveLength(1);
    expect(await getCards({ seriesSlug: "s" })).toHaveLength(1);

    await setSeriesStatus(seriesId, "DRAFT"); // unpublishing the series hides its published cards
    expect(await getCardBySlug("card-1")).toBeNull();
    await setSeriesStatus(seriesId, "PUBLISHED");
  });
});

describe("wishlist", () => {
  it("is idempotent and private", async () => {
    await addToWishlist(alice.id, cardId);
    await addToWishlist(alice.id, cardId);
    expect(await getUserWishlist(alice.id)).toHaveLength(1);
    expect(await getUserWishlist(bob.id)).toHaveLength(0);
  });
});

describe("collection", () => {
  let itemId: string;
  it("merges quantity instead of duplicating", async () => {
    const a = await addToCollection(alice.id, cardId, { ...write, quantity: 3 });
    itemId = a.id;
    const b = await addToCollection(alice.id, cardId, { ...write, quantity: 2, buyPrice: null, sellPrice: null });
    expect(b.id).toBe(a.id);
    expect(b.quantity).toBe(5);
    expect(b.buyPrice).toBe(500); // not overwritten when no price given
    const { items, summary } = await getUserCollection(alice.id);
    expect(items).toHaveLength(1);
    expect(summary).toMatchObject({ uniqueCards: 1, totalCards: 5, totalBuy: 2500, totalSell: 5000 });
  });

  it("user B cannot read or change user A's collection (IDOR)", async () => {
    expect((await getUserCollection(bob.id)).items).toHaveLength(0);
    await expect(updateCollectionItem(bob.id, itemId, write)).rejects.toBeInstanceOf(ServiceError);
    await expect(adjustCollectionQuantity(bob.id, itemId, 1)).rejects.toBeInstanceOf(ServiceError);
    await expect(removeFromCollection(bob.id, itemId)).rejects.toBeInstanceOf(ServiceError);
    await expect(addCollectionImage(bob.id, itemId, "collections/x/y.png")).rejects.toBeInstanceOf(ServiceError);
    expect((await getUserCollection(alice.id)).items[0]!.quantity).toBe(5); // untouched
  });

  it("images belong to their owner", async () => {
    const img = await addCollectionImage(alice.id, itemId, "collections/a/1.png");
    await expect(removeCollectionImage(bob.id, img.id)).rejects.toBeInstanceOf(ServiceError);
    expect((await removeCollectionImage(alice.id, img.id)).key).toBe("collections/a/1.png");
  });

  it("deleting a collected card archives it instead of destroying history", async () => {
    const res = await deleteCard(cardId);
    expect(res.result).toBe("archived");
    expect(await getCardBySlug("card-1")).toBeNull();
    const { items } = await getUserCollection(alice.id);
    expect(items).toHaveLength(1);
    expect(items[0]!.card.archivedAt).not.toBeNull();
  });
});

describe("roles", () => {
  it("admins cannot demote themselves; the last admin is protected", async () => {
    await expect(setUserRole(admin.id, admin.id, "USER")).rejects.toBeInstanceOf(ServiceError);
    const other = await createUser({ username: "adm2", email: "adm2@t.dev", passwordHash: "h", role: "ADMIN" });
    expect((await setUserRole(admin.id, other.id, "USER")).role).toBe("USER");
    const lone = await createUser({ username: "adm3", email: "adm3@t.dev", passwordHash: "h", role: "ADMIN" });
    await expect(setUserRole(lone.id, admin.id, "USER")).resolves.toMatchObject({ role: "USER" }); // two admins -> allowed
    await expect(setUserRole(admin.id, lone.id, "USER")).rejects.toBeInstanceOf(ServiceError); // lone is now the last admin
  });
});

describe("bulk card actions", () => {
  it("deletes unowned cards, archives owned ones, and changes status in bulk", async () => {
    const { deleteCardsBulk, setCardsStatusBulk, adminCardIds, getUserCollection: coll } = await import("../src");
    const s = await createSeries({ name: "Bulk", slug: "bulk", code: "BLK", description: null, releaseDate: null, status: "PUBLISHED" }, null);
    const mk = (n: string) =>
      createCard({ seriesId: s.id, cardNumber: n, name: `B${n}`, slug: `b-${n}`, description: null, rarity: "BP", cardType: "Ninja", status: "DRAFT", attributes: [] }, null);
    const [c1, c2, c3] = [await mk("1"), await mk("2"), await mk("3")];
    expect(await setCardsStatusBulk([c1.id, c2.id, c3.id], "PUBLISHED")).toBe(3);
    await addToCollection(bob.id, c2.id, write); // owned by a user
    const ids = await adminCardIds({ seriesId: s.id });
    expect(ids).toHaveLength(3);
    const res = await deleteCardsBulk(ids);
    expect(res).toMatchObject({ deleted: 2, archived: 1 });
    expect(await adminCardIds({ seriesId: s.id })).toHaveLength(0); // archived hidden from admin list
    expect((await coll(bob.id)).items.some((i) => i.cardId === c2.id)).toBe(true); // history kept
  });
});
