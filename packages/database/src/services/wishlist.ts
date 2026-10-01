import { PAGE_SIZE } from "@naruto-ccg/shared";
import { makePage, pageArgs, prisma, ServiceError, type Prisma } from "../client";
import { publishedCardWhere } from "./series";

const cardSelect = {
  select: { id: true, name: true, slug: true, cardNumber: true, image: true, rarity: true, cardType: true, status: true, archivedAt: true, series: { select: { id: true, name: true, slug: true } } },
} as const;

// ---------- user (always scoped by the caller's own userId) ----------

export async function addToWishlist(userId: string, cardId: string) {
  const card = await prisma.card.findFirst({ where: { id: cardId, ...publishedCardWhere }, select: { id: true } });
  if (!card) throw new ServiceError("Kartu tidak ditemukan.");
  // Unique(userId, cardId) makes this idempotent.
  return prisma.wishlistItem.upsert({
    where: { userId_cardId: { userId, cardId } },
    create: { userId, cardId },
    update: {},
  });
}

export async function removeFromWishlist(userId: string, cardId: string) {
  const res = await prisma.wishlistItem.deleteMany({ where: { userId, cardId } });
  return res.count > 0;
}

export async function getUserWishlist(userId: string) {
  return prisma.wishlistItem.findMany({
    where: { userId, card: publishedCardWhere },
    orderBy: { createdAt: "desc" },
    include: { card: cardSelect },
  });
}

// ---------- admin (read-only) ----------

export async function getUserWishlistByAdmin(userId: string, opts: { q?: string; page?: number } = {}) {
  const q = opts.q?.trim();
  const where: Prisma.WishlistItemWhereInput = {
    userId,
    ...(q ? { card: { OR: [{ name: { contains: q } }, { cardNumber: { contains: q } }, { series: { name: { contains: q } } }] } } : {}),
  };
  const { page, skip, take } = pageArgs(opts.page, PAGE_SIZE);
  const [items, total] = await Promise.all([
    prisma.wishlistItem.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { card: cardSelect } }),
    prisma.wishlistItem.count({ where }),
  ]);
  return makePage(items, total, page, PAGE_SIZE);
}

/** Cross-user wishlist search by username/email, card name or card number. */
export async function adminListWishlists(opts: { q?: string; page?: number } = {}) {
  const q = opts.q?.trim();
  const where: Prisma.WishlistItemWhereInput = q
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
    prisma.wishlistItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { card: cardSelect, user: { select: { id: true, username: true, email: true } } },
    }),
    prisma.wishlistItem.count({ where }),
  ]);
  return makePage(items, total, page, PAGE_SIZE);
}
