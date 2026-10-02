/**
 * Database seed. Run with: pnpm db:seed
 *
 *   (default)            real catalog from prisma/seed-data/catalog.json + admin and demo users
 *   SEED_PROFILE=demo    fake demo series/cards with wishlist and collection data (used by the e2e tests)
 *
 * Idempotent: existing rows are left untouched, so re-running never overwrites admin edits.
 * Regenerate catalog.json from the current database with: pnpm db:export-catalog
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/client";
import { hashPassword } from "../src/password";

if (process.env.SEED_PROFILE === "demo") {
  // seed-demo.ts runs itself on import
  await import("./seed-demo");
} else {
  await seedCatalog();
}

interface CatalogCard {
  cardNumber: string;
  name: string;
  slug: string;
  description: string | null;
  rarity: string;
  cardType: string;
  status: string;
  image: string | null;
  attributes: { name: string; value: string }[];
}
interface Catalog {
  rarities: string[];
  series: {
    code: string | null;
    name: string;
    slug: string;
    description: string | null;
    releaseDate: string | null;
    status: string;
    image: string | null;
    cards: CatalogCard[];
  }[];
}

function repoRoot(): string {
  let dir = process.cwd();
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}

async function seedCatalog() {
  const root = repoRoot();
  if (existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));
  const uploadDir = path.resolve(root, process.env.UPLOAD_DIR || "./uploads");
  const seedDir = path.join(root, "packages/database/prisma/seed-data");

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@naruto-ccg.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin#12345";
  const userEmail = process.env.SEED_USER_EMAIL || "user@naruto-ccg.local";
  const userPassword = process.env.SEED_USER_PASSWORD || "User#12345";
  if (process.env.NODE_ENV === "production" && (adminPassword === "Admin#12345" || userPassword === "User#12345")) {
    console.error("Refusing to seed default credentials in production. Set SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD.");
    process.exit(1);
  }

  try {
    const catalog: Catalog = JSON.parse(readFileSync(path.join(seedDir, "catalog.json"), "utf8"));

    // Locally stored catalog images shipped with the repo -> upload directory (never overwrites).
    const copyImage = (key: string | null) => {
      if (!key || /^https?:\/\//i.test(key)) return;
      const src = path.join(seedDir, "uploads", key);
      const dest = path.join(uploadDir, key);
      if (existsSync(src) && !existsSync(dest)) {
        mkdirSync(path.dirname(dest), { recursive: true });
        copyFileSync(src, dest);
      }
    };

    for (const [i, name] of catalog.rarities.entries()) {
      await prisma.rarity.upsert({ where: { name }, update: {}, create: { name, sortOrder: i + 1 } });
    }

    let cardCount = 0;
    for (const s of catalog.series) {
      copyImage(s.image);
      const series = await prisma.series.upsert({
        where: { slug: s.slug },
        update: {},
        create: {
          code: s.code,
          name: s.name,
          slug: s.slug,
          description: s.description,
          releaseDate: s.releaseDate ? new Date(`${s.releaseDate}T00:00:00.000Z`) : null,
          status: s.status,
          image: s.image,
        },
      });
      for (const c of s.cards) {
        copyImage(c.image);
        await prisma.card.upsert({
          where: { slug: c.slug },
          update: {},
          create: {
            seriesId: series.id,
            cardNumber: c.cardNumber,
            name: c.name,
            slug: c.slug,
            description: c.description,
            rarity: c.rarity,
            cardType: c.cardType,
            status: c.status,
            image: c.image,
            attributes: { create: c.attributes.map((a, idx) => ({ ...a, sortOrder: idx })) },
          },
        });
        cardCount++;
      }
    }

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { role: "ADMIN", status: "ACTIVE" },
      create: { username: "admin", email: adminEmail, passwordHash: await hashPassword(adminPassword), role: "ADMIN" },
    });
    await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { username: "demo_user", email: userEmail, passwordHash: await hashPassword(userPassword), role: "USER" },
    });

    console.log(`Seeded ${catalog.series.length} series, ${cardCount} cards, ${catalog.rarities.length} rarities.`);
    console.log(`Admin: ${adminEmail}  |  User: ${userEmail}  (passwords: see README / .env)`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
