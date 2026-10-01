import { PAGE_SIZE, slugify, type CardInput } from "@naruto-ccg/shared";
import { isUniqueViolation, makePage, pageArgs, prisma, ServiceError, type Prisma } from "../client";
import { ensureRarities } from "./rarities";
import { publishedCardWhere } from "./series";

const cardListInclude = { series: { select: { id: true, name: true, slug: true } } } satisfies Prisma.CardInclude;

// ---------- public (only PUBLISHED, non-archived cards of PUBLISHED series) ----------

export async function getCards(opts: { seriesSlug?: string; q?: string } = {}) {
  const where: Prisma.CardWhereInput = {
    ...publishedCardWhere,
    ...(opts.seriesSlug ? { series: { slug: opts.seriesSlug, status: "PUBLISHED" } } : {}),
    ...(opts.q ? { OR: [{ name: { contains: opts.q } }, { cardNumber: { contains: opts.q } }] } : {}),
  };
  return prisma.card.findMany({ where, orderBy: [{ cardNumber: "asc" }], include: cardListInclude });
}

export async function getCardBySlug(slug: string) {
  return prisma.card.findFirst({
    where: { slug, ...publishedCardWhere },
    include: { series: { select: { id: true, name: true, slug: true } }, attributes: { orderBy: { sortOrder: "asc" } } },
  });
}

/** Which of these cards the user has wishlisted / owns (for button state). */
export async function getUserCardStates(userId: string, cardIds: string[]) {
  const [wl, col] = await Promise.all([
    prisma.wishlistItem.findMany({ where: { userId, cardId: { in: cardIds } }, select: { cardId: true } }),
    prisma.collectionItem.findMany({ where: { userId, cardId: { in: cardIds } }, select: { cardId: true, quantity: true } }),
  ]);
  return {
    wishlisted: new Set(wl.map((w) => w.cardId)),
    owned: new Map(col.map((c) => [c.cardId, c.quantity])),
  };
}

// ---------- admin ----------

export interface AdminCardFilters {
  q?: string;
  seriesId?: string;
  rarity?: string;
  cardType?: string;
  status?: string;
  page?: number;
}

function adminCardWhere(f: AdminCardFilters): Prisma.CardWhereInput {
  const q = f.q?.trim();
  return {
    archivedAt: null,
    ...(f.seriesId ? { seriesId: f.seriesId } : {}),
    ...(f.rarity ? { rarity: f.rarity } : {}),
    ...(f.cardType ? { cardType: f.cardType } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { cardNumber: { contains: q } }, { series: { name: { contains: q } } }] } : {}),
  };
}

/** All cards matching the filters (no pagination) with attributes, for export. */
export async function adminExportCards(f: AdminCardFilters = {}) {
  return prisma.card.findMany({
    where: adminCardWhere(f),
    orderBy: [{ series: { slug: "asc" } }, { cardNumber: "asc" }],
    include: { series: { select: { slug: true, code: true, name: true } }, attributes: { orderBy: { sortOrder: "asc" } } },
  });
}

export async function adminListCards(f: AdminCardFilters = {}) {
  const where = adminCardWhere(f);
  const { page, skip, take } = pageArgs(f.page, PAGE_SIZE);
  const [items, total] = await Promise.all([
    prisma.card.findMany({ where, orderBy: [{ series: { name: "asc" } }, { cardNumber: "asc" }], skip, take, include: cardListInclude }),
    prisma.card.count({ where }),
  ]);
  return makePage(items, total, page, PAGE_SIZE);
}

export async function adminGetCard(id: string) {
  return prisma.card.findUnique({
    where: { id },
    include: { series: { select: { id: true, name: true, slug: true } }, attributes: { orderBy: { sortOrder: "asc" } } },
  });
}

function mapCardError(e: unknown): never {
  if (isUniqueViolation(e)) {
    const target = JSON.stringify(e.meta?.target ?? "");
    if (target.includes("slug")) throw new ServiceError("Slug ini sudah digunakan.", "slug");
    throw new ServiceError("Kartu dengan nomor ini sudah ada di seri tersebut.", "cardNumber");
  }
  throw e;
}

async function assertSeriesExists(seriesId: string) {
  if (!(await prisma.series.count({ where: { id: seriesId } }))) throw new ServiceError("Seri tidak ditemukan.", "seriesId");
}

export async function createCard(input: CardInput, image: string | null) {
  await assertSeriesExists(input.seriesId);
  const { attributes, image: _remote, ...data } = input;
  void _remote;
  try {
    const card = await prisma.card.create({
      data: { ...data, image, attributes: { create: attributes.map((a, i) => ({ ...a, sortOrder: i })) } },
    });
    await ensureRarities(prisma, [data.rarity]);
    return card;
  } catch (e) {
    mapCardError(e);
  }
}

/** Attributes are replaced wholesale (order of the array = sortOrder). */
export async function updateCard(id: string, input: CardInput, image?: string | null) {
  await assertSeriesExists(input.seriesId);
  const { attributes, image: _remote, ...data } = input;
  void _remote;
  try {
    return await prisma.$transaction(async (tx) => {
      await ensureRarities(tx, [data.rarity]);
      await tx.cardAttribute.deleteMany({ where: { cardId: id } });
      return tx.card.update({
        where: { id },
        data: {
          ...data,
          ...(image !== undefined ? { image } : {}),
          archivedAt: null,
          attributes: { create: attributes.map((a, i) => ({ ...a, sortOrder: i })) },
        },
      });
    });
  } catch (e) {
    mapCardError(e);
  }
}

export async function setCardStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  return prisma.card.update({ where: { id }, data: { status } });
}

/**
 * Cards that users own are archived (hidden from catalog, kept for collection history).
 * Cards nobody owns are hard-deleted; wishlist entries cascade.
 */
export async function deleteCard(id: string): Promise<{ result: "deleted" | "archived"; image: string | null }> {
  const card = await prisma.card.findUnique({ where: { id }, include: { _count: { select: { collectionItems: true } } } });
  if (!card) throw new ServiceError("Kartu tidak ditemukan.");
  if (card._count.collectionItems > 0) {
    await prisma.card.update({ where: { id }, data: { archivedAt: new Date(), status: "DRAFT" } });
    return { result: "archived", image: null };
  }
  await prisma.card.delete({ where: { id } });
  return { result: "deleted", image: card.image };
}

export type CardImportRow = Omit<CardInput, "slug" | "seriesId" | "image"> & {
  seriesCode: string;
  slug: string | null;
  image: string | null;
  line: number;
};

/**
 * Bulk create/update, matched on (series, card number). All-or-nothing: any failure rolls everything back.
 * Series are found by code (or slug) and auto-created when missing. A blank slug keeps the existing slug
 * (update) or is generated from name/number/series (create); a blank image keeps the existing image.
 */
export async function upsertCardsBulk(
  rows: CardImportRow[],
  opts: { publishSeries?: boolean } = {},
): Promise<{ created: number; updated: number; seriesCreated: string[] }> {
  let created = 0;
  let updated = 0;
  const seriesCreated: string[] = [];
  await prisma.$transaction(
    async (tx) => {
      await ensureRarities(tx, rows.map((r) => r.rarity));
      const seriesCache = new Map<string, { id: string; slug: string }>();
      for (const { seriesCode, line, slug, attributes, image, ...data } of rows) {
        try {
          let series = seriesCache.get(seriesCode);
          if (!series) {
            const found = await tx.series.findFirst({ where: { OR: [{ code: seriesCode }, { slug: seriesCode.toLowerCase() }] } });
            if (found) series = { id: found.id, slug: found.slug };
            else {
              let newSlug = slugify(seriesCode) || "seri";
              if (await tx.series.findUnique({ where: { slug: newSlug } })) newSlug = `${newSlug}-seri`;
              const made = await tx.series.create({
                data: { name: `Seri ${seriesCode}`, slug: newSlug, code: seriesCode, status: opts.publishSeries ? "PUBLISHED" : "DRAFT" },
              });
              series = { id: made.id, slug: made.slug };
              seriesCreated.push(seriesCode);
            }
            seriesCache.set(seriesCode, series);
          }

          const existing = await tx.card.findUnique({ where: { seriesId_cardNumber: { seriesId: series.id, cardNumber: data.cardNumber } } });
          const finalSlug = slug ?? existing?.slug ?? `${slugify(data.name)}-${slugify(data.cardNumber)}-${series.slug}`;
          const attrs = { create: attributes.map((a, i) => ({ ...a, sortOrder: i })) };
          if (existing) {
            await tx.cardAttribute.deleteMany({ where: { cardId: existing.id } });
            await tx.card.update({
              where: { id: existing.id },
              data: { ...data, slug: finalSlug, ...(image ? { image } : {}), archivedAt: null, attributes: attrs },
            });
            updated++;
          } else {
            await tx.card.create({ data: { ...data, seriesId: series.id, slug: finalSlug, image, attributes: attrs } });
            created++;
          }
        } catch (e) {
          if (isUniqueViolation(e)) throw new ServiceError(`Baris ${line}: slug sudah digunakan oleh kartu lain.`);
          throw e;
        }
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  return { created, updated, seriesCreated };
}


// ---------- bulk actions (admin) ----------

const CHUNK = 500;
const chunks = <T>(a: T[]): T[][] => Array.from({ length: Math.ceil(a.length / CHUNK) }, (_, i) => a.slice(i * CHUNK, (i + 1) * CHUNK));

/** Ids of every card matching the filters (used for "select all N matching"). */
export async function adminCardIds(f: AdminCardFilters = {}): Promise<string[]> {
  const rows = await prisma.card.findMany({ where: adminCardWhere(f), select: { id: true } });
  return rows.map((r) => r.id);
}

export async function setCardsStatusBulk(ids: string[], status: "DRAFT" | "PUBLISHED"): Promise<number> {
  let n = 0;
  for (const part of chunks(ids)) n += (await prisma.card.updateMany({ where: { id: { in: part }, archivedAt: null }, data: { status } })).count;
  return n;
}

/**
 * Same rule as deleteCard, applied to many: cards owned by users are archived, the rest are deleted.
 * Returns storage keys of deleted cards' images so the caller can remove the files.
 */
export async function deleteCardsBulk(ids: string[]): Promise<{ deleted: number; archived: number; images: string[] }> {
  let deleted = 0;
  let archived = 0;
  const images: string[] = [];
  for (const part of chunks(ids)) {
    await prisma.$transaction(async (tx) => {
      const cards = await tx.card.findMany({ where: { id: { in: part } }, select: { id: true, image: true, _count: { select: { collectionItems: true } } } });
      const owned = cards.filter((c) => c._count.collectionItems > 0).map((c) => c.id);
      const free = cards.filter((c) => c._count.collectionItems === 0);
      if (owned.length) {
        await tx.card.updateMany({ where: { id: { in: owned } }, data: { archivedAt: new Date(), status: "DRAFT" } });
        archived += owned.length;
      }
      if (free.length) {
        await tx.card.deleteMany({ where: { id: { in: free.map((c) => c.id) } } });
        deleted += free.length;
        images.push(...free.map((c) => c.image).filter((k): k is string => !!k));
      }
    });
  }
  return { deleted, archived, images };
}
