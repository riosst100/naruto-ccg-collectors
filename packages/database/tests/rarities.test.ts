import { describe, expect, it } from "vitest";
import {
  addToCollection,
  createCard,
  createRarity,
  createSeries,
  createUser,
  deleteRarity,
  ensureRarities,
  getUserCollection,
  listRaritiesRanked,
  moveRarity,
  prisma,
  renameRarity,
  ServiceError,
} from "../src";

const names = async () => (await listRaritiesRanked()).map((r) => r.name);
const write = { quantity: 1, buyPrice: null, sellPrice: null, notes: null };

describe("rarity ranking", () => {
  it("creates at the lowest rank, moves up/down, renames cards along, and protects used rarities", async () => {
    await prisma.rarity.deleteMany();
    await createRarity("Gold");
    await createRarity("Silver");
    await createRarity("Bronze");
    expect(await names()).toEqual(["Gold", "Silver", "Bronze"]);
    await expect(createRarity("Gold")).rejects.toBeInstanceOf(ServiceError);

    const bronze = (await listRaritiesRanked()).find((r) => r.name === "Bronze")!;
    await moveRarity(bronze.id, "up");
    expect(await names()).toEqual(["Gold", "Bronze", "Silver"]);
    await moveRarity(bronze.id, "up");
    await moveRarity(bronze.id, "up"); // already on top: no-op
    expect(await names()).toEqual(["Bronze", "Gold", "Silver"]);
    await moveRarity(bronze.id, "down");
    expect(await names()).toEqual(["Gold", "Bronze", "Silver"]);

    // auto-register unknown rarity names at the bottom (idempotent)
    await ensureRarities(prisma, ["Gold", "Platinum", "Platinum"]);
    expect(await names()).toEqual(["Gold", "Bronze", "Silver", "Platinum"]);

    const s = await createSeries({ name: "R", slug: "r-series", code: null, description: null, releaseDate: null, status: "PUBLISHED" }, null);
    await createCard({ seriesId: s.id, cardNumber: "1", name: "C1", slug: "r-c1", description: null, rarity: "Silver", cardType: "Ninja", status: "PUBLISHED", attributes: [] }, null);

    const silver = (await listRaritiesRanked()).find((r) => r.name === "Silver")!;
    expect(silver.cardCount).toBe(1);
    await expect(deleteRarity(silver.id)).rejects.toBeInstanceOf(ServiceError); // in use
    await renameRarity(silver.id, "Perak");
    expect((await prisma.card.findUniqueOrThrow({ where: { slug: "r-c1" } })).rarity).toBe("Perak");
    const platinum = (await listRaritiesRanked()).find((r) => r.name === "Platinum")!;
    await deleteRarity(platinum.id); // unused: ok
    expect(await names()).toEqual(["Gold", "Bronze", "Perak"]);
  });

  it("sorts a user's collection by rarity rank (unranked last)", async () => {
    await prisma.rarity.deleteMany();
    await createRarity("Tinggi");
    await createRarity("Rendah");
    const s = await createSeries({ name: "Sort", slug: "sort-series", code: null, description: null, releaseDate: null, status: "PUBLISHED" }, null);
    const user = await createUser({ username: "sorter", email: "sorter@t.dev", passwordHash: "h" });
    const mk = async (n: string, rarity: string) => {
      const c = await createCard({ seriesId: s.id, cardNumber: n, name: `S${n}`, slug: `sort-${n}`, description: null, rarity, cardType: "Ninja", status: "PUBLISHED", attributes: [] }, null);
      await addToCollection(user.id, c.id, write);
    };
    await mk("1", "Rendah");
    await mk("2", "TidakTerdaftar"); // auto-registered at the bottom by createCard, so it ranks after the two above
    await mk("3", "Tinggi");
    await mk("4", "Rendah");
    const { items } = await getUserCollection(user.id);
    expect(items.map((i) => i.card.rarity)).toEqual(["Tinggi", "Rendah", "Rendah", "TidakTerdaftar"]);
    expect(items.filter((i) => i.card.rarity === "Rendah").map((i) => i.card.cardNumber)).toEqual(["1", "4"]);
  });
});
