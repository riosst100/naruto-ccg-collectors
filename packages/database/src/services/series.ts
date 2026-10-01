import { PAGE_SIZE, type SeriesInput } from "@naruto-ccg/shared";
import { isUniqueViolation, makePage, pageArgs, prisma, ServiceError, type Prisma } from "../client";

export const publishedCardWhere = {
  status: "PUBLISHED",
  archivedAt: null,
  series: { status: "PUBLISHED" },
} satisfies Prisma.CardWhereInput;

// ---------- public ----------

export async function getSeries() {
  const rows = await prisma.series.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ releaseDate: "asc" }, { name: "asc" }],
    include: { _count: { select: { cards: { where: { status: "PUBLISHED", archivedAt: null } } } } },
  });
  return rows.map(({ _count, ...s }) => ({ ...s, cardCount: _count.cards }));
}

export async function getSeriesBySlug(slug: string) {
  const s = await prisma.series.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { _count: { select: { cards: { where: { status: "PUBLISHED", archivedAt: null } } } } },
  });
  if (!s) return null;
  const { _count, ...rest } = s;
  return { ...rest, cardCount: _count.cards };
}

// ---------- admin ----------

export async function adminListSeries(opts: { q?: string; page?: number } = {}) {
  const where: Prisma.SeriesWhereInput = opts.q ? { name: { contains: opts.q.trim() } } : {};
  const { page, skip, take } = pageArgs(opts.page, PAGE_SIZE);
  const [items, total] = await Promise.all([
    prisma.series.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { _count: { select: { cards: { where: { archivedAt: null } } } } },
    }),
    prisma.series.count({ where }),
  ]);
  const owned = await Promise.all(items.map((s) => prisma.collectionItem.count({ where: { card: { seriesId: s.id } } })));
  return makePage(
    items.map(({ _count, ...s }, i) => ({ ...s, cardCount: _count.cards, collectionItemCount: owned[i]! })),
    total,
    page,
    PAGE_SIZE,
  );
}

export async function adminGetSeries(id: string) {
  const s = await prisma.series.findUnique({
    where: { id },
    include: { _count: { select: { cards: { where: { archivedAt: null } } } } },
  });
  if (!s) return null;
  const { _count, ...rest } = s;
  return { ...rest, cardCount: _count.cards };
}

export async function adminListAllSeriesOptions() {
  return prisma.series.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

function mapSeriesError(e: unknown): unknown {
  if (isUniqueViolation(e)) {
    return JSON.stringify(e.meta?.target ?? "").includes("code")
      ? new ServiceError("Kode seri ini sudah digunakan.", "code")
      : new ServiceError("Slug ini sudah digunakan.", "slug");
  }
  return e;
}

export async function createSeries(input: SeriesInput, image: string | null) {
  try {
    return await prisma.series.create({ data: { ...input, image } });
  } catch (e) {
    throw mapSeriesError(e);
    throw e;
  }
}

export async function updateSeries(id: string, input: SeriesInput, image?: string | null) {
  try {
    return await prisma.series.update({ where: { id }, data: { ...input, ...(image !== undefined ? { image } : {}) } });
  } catch (e) {
    throw mapSeriesError(e);
    throw e;
  }
}

export async function setSeriesStatus(id: string, status: "DRAFT" | "PUBLISHED") {
  return prisma.series.update({ where: { id }, data: { status } });
}

/**
 * Deletes a series AND all of its cards. Because users may own those cards, their collection items
 * (and photos) and wishlist entries for them are deleted too; the admin UI states these counts first.
 * Returns every storage key that should be removed from file storage.
 */
export async function deleteSeries(id: string): Promise<{ imageKeys: string[]; cards: number; collectionItems: number }> {
  const series = await prisma.series.findUnique({
    where: { id },
    include: { cards: { select: { id: true, image: true } } },
  });
  if (!series) throw new ServiceError("Seri tidak ditemukan.");
  const cardIds = series.cards.map((c) => c.id);

  return prisma.$transaction(async (tx) => {
    const items = await tx.collectionItem.findMany({ where: { cardId: { in: cardIds } }, select: { id: true, images: { select: { imageUrl: true } } } });
    await tx.collectionItem.deleteMany({ where: { cardId: { in: cardIds } } }); // images cascade
    await tx.card.deleteMany({ where: { seriesId: id } }); // attributes + wishlist cascade
    await tx.series.delete({ where: { id } });
    const imageKeys = [series.image, ...series.cards.map((c) => c.image), ...items.flatMap((i) => i.images.map((im) => im.imageUrl))].filter((k): k is string => !!k);
    return { imageKeys, cards: cardIds.length, collectionItems: items.length };
  });
}
