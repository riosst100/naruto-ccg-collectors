import { isUniqueViolation, prisma, ServiceError, type Prisma } from "../client";

type Db = Prisma.TransactionClient | typeof prisma;

/** Rarities ordered high -> low, with how many cards use each. */
export async function listRaritiesRanked() {
  const [rows, counts] = await Promise.all([
    prisma.rarity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.card.groupBy({ by: ["rarity"], _count: { _all: true } }),
  ]);
  const used = new Map(counts.map((c) => [c.rarity, c._count._all]));
  return rows.map((r, i) => ({ id: r.id, name: r.name, label: r.label, rank: i + 1, cardCount: used.get(r.name) ?? 0 }));
}

/** Rank per rarity name (1 = highest). Names that are not ranked are absent: callers sort them last. */
export async function rarityRankMap(): Promise<Map<string, number>> {
  const rows = await prisma.rarity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true } });
  return new Map(rows.map((r, i) => [r.name, i + 1]));
}

/** Names for pickers/filters: ranked ones (high -> low) followed by any card rarity not yet ranked. */
export async function listRarities(): Promise<string[]> {
  const ranked = (await prisma.rarity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true } })).map((r) => r.name);
  const rows = await prisma.card.findMany({ distinct: ["rarity"], select: { rarity: true }, orderBy: { rarity: "asc" } });
  const extra = rows.map((r) => r.rarity).filter((n) => !ranked.includes(n));
  return [...ranked, ...extra];
}

/** Registers unknown rarity names at the lowest rank (used by card save and import). */
export async function ensureRarities(db: Db, names: string[]): Promise<void> {
  const wanted = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (wanted.length === 0) return;
  const existing = new Set((await db.rarity.findMany({ where: { name: { in: wanted } }, select: { name: true } })).map((r) => r.name));
  const missing = wanted.filter((n) => !existing.has(n));
  if (missing.length === 0) return;
  const last = await db.rarity.aggregate({ _max: { sortOrder: true } });
  let next = (last._max.sortOrder ?? 0) + 1;
  for (const name of missing) await db.rarity.create({ data: { name, sortOrder: next++ } });
}

function cleanName(raw: string): string {
  const name = raw.trim();
  if (name.length < 1) throw new ServiceError("Nama kelangkaan wajib diisi.", "name");
  if (name.length > 40) throw new ServiceError("Maksimal 40 karakter.", "name");
  return name;
}

/** Optional full name; empty means none. */
function cleanLabel(raw: string): string | null {
  const label = raw.trim();
  if (label.length > 80) throw new ServiceError("Maksimal 80 karakter.", "label");
  return label || null;
}

export async function createRarity(rawName: string, rawLabel = "") {
  const name = cleanName(rawName);
  const label = cleanLabel(rawLabel);
  try {
    return await prisma.$transaction(async (tx) => {
      const last = await tx.rarity.aggregate({ _max: { sortOrder: true } });
      return tx.rarity.create({ data: { name, label, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new ServiceError("Kelangkaan ini sudah ada.", "name");
    throw e;
  }
}

/** Renames the rarity code (and every card that uses it); a given label replaces the full name. */
export async function renameRarity(id: string, rawName: string, rawLabel?: string) {
  const name = cleanName(rawName);
  const label = rawLabel === undefined ? undefined : cleanLabel(rawLabel);
  const current = await prisma.rarity.findUnique({ where: { id } });
  if (!current) throw new ServiceError("Kelangkaan tidak ditemukan.");
  if (current.name === name && (label === undefined || current.label === label)) return current;
  try {
    return await prisma.$transaction(async (tx) => {
      if (current.name !== name) await tx.card.updateMany({ where: { rarity: current.name }, data: { rarity: name } });
      return tx.rarity.update({ where: { id }, data: { name, label } });
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new ServiceError("Kelangkaan ini sudah ada.", "name");
    throw e;
  }
}

/** Swaps with the neighbour above ("up" = higher rarity) or below. Ranks are renumbered 1..n. */
export async function moveRarity(id: string, direction: "up" | "down") {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.rarity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true } });
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new ServiceError("Kelangkaan tidak ditemukan.");
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j]!, rows[i]!];
    for (const [idx, r] of rows.entries()) await tx.rarity.update({ where: { id: r.id }, data: { sortOrder: idx + 1 } });
  });
}

/** Only unused rarities can be removed (otherwise cards would silently lose their ranking). */
export async function deleteRarity(id: string) {
  const r = await prisma.rarity.findUnique({ where: { id } });
  if (!r) throw new ServiceError("Kelangkaan tidak ditemukan.");
  const used = await prisma.card.count({ where: { rarity: r.name } });
  if (used > 0) throw new ServiceError(`Kelangkaan ini dipakai ${used} kartu. Ubah kartunya atau ganti nama kelangkaan ini.`);
  await prisma.rarity.delete({ where: { id } });
}
