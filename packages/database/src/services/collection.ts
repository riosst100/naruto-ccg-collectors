import { PAGE_SIZE, UPLOAD_LIMITS } from "@naruto-ccg/shared";
import { makePage, pageArgs, prisma, ServiceError, type Prisma } from "../client";
import { rarityRankMap } from "./rarities";
import { publishedCardWhere } from "./series";

const MAX_QTY = 9999;

const cardSelect = {
  select: { id: true, name: true, slug: true, cardNumber: true, image: true, rarity: true, cardType: true, status: true, archivedAt: true, series: { select: { id: true, name: true, slug: true } } },
} as const;

export interface CollectionWrite {
  quantity: number;
  buyPrice: number | null;
  sellPrice: number | null;
  notes: string | null;
}

// ---------- user (every function is scoped by the caller's own userId: no IDOR) ----------

/**
 * Adds a card. If the user already owns it, quantity is incremented (never duplicated).
 * Prices/notes only overwrite existing values when the caller actually provided them.
 */
export async function addToCollection(userId: string, cardId: string, input: CollectionWrite) {
  const card = await prisma.card.findFirst({ where: { id: cardId, ...publishedCardWhere }, select: { id: true } });
  if (!card) throw new ServiceError("Kartu tidak ditemukan.");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.collectionItem.findUnique({ where: { userId_cardId: { userId, cardId } } });
    if (!existing) {
      return tx.collectionItem.create({
        data: {
          userId,
          cardId,
          quantity: input.quantity,
          buyPrice: input.buyPrice,
          sellPrice: input.sellPrice,
          notes: input.notes,
        },
      });
    }
    const quantity = existing.quantity + input.quantity;
    if (quantity > MAX_QTY) throw new ServiceError(`Jumlah tidak boleh melebihi ${MAX_QTY}.`, "quantity");
    const priceGiven = input.buyPrice != null || input.sellPrice != null;
    return tx.collectionItem.update({
      where: { id: existing.id },
      data: {
        quantity,
        ...(priceGiven
          ? {
              buyPrice: input.buyPrice ?? existing.buyPrice,
              sellPrice: input.sellPrice ?? existing.sellPrice,
            }
          : {}),
        ...(input.notes ? { notes: input.notes } : {}),
      },
    });
  });
}

async function getOwnedItem(userId: string, itemId: string) {
  const item = await prisma.collectionItem.findFirst({ where: { id: itemId, userId } });
  if (!item) throw new ServiceError("Item koleksi tidak ditemukan.");
  return item;
}

export async function getOwnedCollectionItem(userId: string, itemId: string) {
  return getOwnedItem(userId, itemId);
}

export async function updateCollectionItem(userId: string, itemId: string, input: CollectionWrite) {
  await getOwnedItem(userId, itemId);
  return prisma.collectionItem.update({
    where: { id: itemId },
    data: {
      quantity: input.quantity,
      buyPrice: input.buyPrice,
      sellPrice: input.sellPrice,
      notes: input.notes,
    },
  });
}

export async function adjustCollectionQuantity(userId: string, itemId: string, delta: number) {
  const item = await getOwnedItem(userId, itemId);
  const quantity = item.quantity + delta;
  if (quantity < 1) throw new ServiceError("Jumlah tidak boleh kurang dari 1. Hapus item jika diperlukan.");
  if (quantity > MAX_QTY) throw new ServiceError(`Jumlah tidak boleh melebihi ${MAX_QTY}.`);
  return prisma.collectionItem.update({ where: { id: itemId }, data: { quantity } });
}

/** Returns the storage keys of the item's images so the caller can delete the files. */
export async function removeFromCollection(userId: string, itemId: string): Promise<{ imageKeys: string[] }> {
  const item = await prisma.collectionItem.findFirst({ where: { id: itemId, userId }, include: { images: true } });
  if (!item) throw new ServiceError("Item koleksi tidak ditemukan.");
  await prisma.collectionItem.delete({ where: { id: itemId } });
  return { imageKeys: item.images.map((i) => i.imageUrl) };
}

export async function countCollectionImages(userId: string, itemId: string) {
  await getOwnedItem(userId, itemId);
  return prisma.collectionImage.count({ where: { collectionItemId: itemId } });
}

export async function addCollectionImage(userId: string, itemId: string, key: string) {
  await getOwnedItem(userId, itemId);
  const count = await prisma.collectionImage.count({ where: { collectionItemId: itemId } });
  if (count >= UPLOAD_LIMITS.maxImagesPerCollectionItem) throw new ServiceError(`Maksimal ${UPLOAD_LIMITS.maxImagesPerCollectionItem} gambar per kartu.`);
  return prisma.collectionImage.create({ data: { collectionItemId: itemId, imageUrl: key } });
}

export async function removeCollectionImage(userId: string, imageId: string): Promise<{ key: string }> {
  const img = await prisma.collectionImage.findFirst({ where: { id: imageId, collectionItem: { userId } } });
  if (!img) throw new ServiceError("Gambar tidak ditemukan.");
  await prisma.collectionImage.delete({ where: { id: imageId } });
  return { key: img.imageUrl };
}

export type CollectionRow = Awaited<ReturnType<typeof getUserCollection>>["items"][number];

export interface CollectionSummary {
  uniqueCards: number;
  totalCards: number;
  totalBuy: number;
  totalSell: number;
}

export function summarize(items: { quantity: number; buyPrice: number | null; sellPrice: number | null }[]): CollectionSummary {
  let totalCards = 0;
  let totalBuy = 0;
  let totalSell = 0;
  for (const i of items) {
    totalCards += i.quantity;
    totalBuy += (i.buyPrice ?? 0) * i.quantity;
    totalSell += (i.sellPrice ?? 0) * i.quantity;
  }
  return { uniqueCards: items.length, totalCards, totalBuy, totalSell };
}

export async function getUserCollection(userId: string, opts: { q?: string } = {}) {
  const q = opts.q?.trim();
  const where: Prisma.CollectionItemWhereInput = {
    userId,
    ...(q ? { card: { OR: [{ name: { contains: q } }, { cardNumber: { contains: q } }] } } : {}),
  };
  const items = await prisma.collectionItem.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { card: cardSelect, images: { orderBy: { createdAt: "asc" } } },
  });
  // Highest rarity first; unranked rarities last. Within a rarity: card number, then name.
  const rank = await rarityRankMap();
  const rankOf = (r: string) => rank.get(r) ?? Number.MAX_SAFE_INTEGER;
  items.sort(
    (a, b) =>
      rankOf(a.card.rarity) - rankOf(b.card.rarity) ||
      a.card.rarity.localeCompare(b.card.rarity) ||
      a.card.cardNumber.localeCompare(b.card.cardNumber, undefined, { numeric: true }) ||
      a.card.name.localeCompare(b.card.name),
  );
  return { items, summary: summarize(items) };
}

// ---------- admin (read-only) ----------

export async function getUserCollectionByAdmin(userId: string, opts: { q?: string; page?: number } = {}) {
  const q = opts.q?.trim();
  const where: Prisma.CollectionItemWhereInput = {
    userId,
    ...(q ? { card: { OR: [{ name: { contains: q } }, { cardNumber: { contains: q } }, { series: { name: { contains: q } } }] } } : {}),
  };
  const { page, skip, take } = pageArgs(opts.page, PAGE_SIZE);
  const [items, total, all] = await Promise.all([
    prisma.collectionItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { card: cardSelect, images: { orderBy: { createdAt: "asc" } } },
    }),
    prisma.collectionItem.count({ where }),
    prisma.collectionItem.findMany({ where: { userId }, select: { quantity: true, buyPrice: true, sellPrice: true } }),
  ]);
  return { ...makePage(items, total, page, PAGE_SIZE), summary: summarize(all) };
}

/** Cross-user collection search by username/email, card name or card number. */
export async function adminListCollections(opts: { q?: string; page?: number } = {}) {
  const q = opts.q?.trim();
  const where: Prisma.CollectionItemWhereInput = q
    ? {
        OR: [
          { user: { username: { contains: q } } },
          { user: { email: { contains: q } } },
          { card: { name: { contains: q } } },
          { card: { cardNumber: { contains: q } } },
        ],
      }
    : {};
  const { page, skip, take } = pageArgs(opts.page, PAGE_SIZE);
  const [items, total] = await Promise.all([
    prisma.collectionItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { card: cardSelect, user: { select: { id: true, username: true, email: true } }, images: { take: 1 } },
    }),
    prisma.collectionItem.count({ where }),
  ]);
  return makePage(items, total, page, PAGE_SIZE);
}
