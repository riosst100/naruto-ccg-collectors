/**
 * Exports the catalog (rarity ranking, series, cards, card attributes) from the current database into
 * prisma/seed-data/catalog.json so `pnpm db:seed` can rebuild it. Personal data (users, password hashes,
 * wishlists, collections) is NOT exported. Locally uploaded catalog images are copied next to the JSON.
 *
 *   pnpm db:export-catalog                      # from the dev database
 *   DATABASE_URL=file:/path/to/naruto.db UPLOAD_DIR=/path/uploads pnpm db:export-catalog
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/client";

function repoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}
const root = repoRoot();
const uploadDir = path.resolve(root, process.env.UPLOAD_DIR || "./uploads");
const outDir = path.join(root, "packages/database/prisma/seed-data");

const isRemote = (v: string | null) => !!v && /^https?:\/\//i.test(v);

function keepImage(key: string | null): string | null {
  if (!key || isRemote(key)) return key;
  const src = path.join(uploadDir, key);
  if (existsSync(src)) {
    const dest = path.join(outDir, "uploads", key);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    return key;
  }
  console.warn(`! image file not found, exported without image: ${key}`);
  return null;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const [rarityRows, seriesRows] = await Promise.all([
    prisma.rarity.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.series.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        cards: { where: { archivedAt: null }, orderBy: [{ cardNumber: "asc" }], include: { attributes: { orderBy: { sortOrder: "asc" } } } },
      },
    }),
  ]);

  const usedRarities = new Set(seriesRows.flatMap((s) => s.cards.map((c) => c.rarity)));
  const catalog = {
    exportedAt: new Date().toISOString(),
    // Ranked high -> low; only rarities that exported cards use (unused leftovers are skipped).
    rarities: rarityRows.map((r) => r.name).filter((n) => usedRarities.has(n)),
    series: seriesRows.map((s) => ({
      code: s.code,
      name: s.name,
      slug: s.slug,
      description: s.description,
      releaseDate: s.releaseDate?.toISOString().slice(0, 10) ?? null,
      status: s.status,
      image: keepImage(s.image),
      cards: s.cards.map((c) => ({
        cardNumber: c.cardNumber,
        name: c.name,
        slug: c.slug,
        description: c.description,
        rarity: c.rarity,
        cardType: c.cardType,
        status: c.status,
        image: keepImage(c.image),
        attributes: c.attributes.map((a) => ({ name: a.name, value: a.value })),
      })),
    })),
  };

  writeFileSync(path.join(outDir, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
  const cards = catalog.series.reduce((n, s) => n + s.cards.length, 0);
  console.log(`Exported ${catalog.series.length} series, ${cards} cards, ${catalog.rarities.length} rarities -> ${path.relative(root, outDir)}/catalog.json`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
