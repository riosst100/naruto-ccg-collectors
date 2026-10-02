/* Development seed. Run with: pnpm db:seed */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { existsSync } from "node:fs";
import { CARD_TYPES, RARITIES, slugify } from "@naruto-ccg/shared";
import { hashPassword } from "../src/password";
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
if (existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));
const uploadDir = path.resolve(root, process.env.UPLOAD_DIR || "./uploads");

const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@naruto-ccg.local";
const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin#12345";
const userEmail = process.env.SEED_USER_EMAIL || "user@naruto-ccg.local";
const userPassword = process.env.SEED_USER_PASSWORD || "User#12345";

if (process.env.NODE_ENV === "production" && (adminPassword === "Admin#12345" || userPassword === "User#12345")) {
  console.error("Refusing to seed default credentials in production. Set SEED_ADMIN_PASSWORD / SEED_USER_PASSWORD.");
  process.exit(1);
}

const xml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Writes a simple SVG placeholder (stand-in for real card art) and returns its storage key. */
function placeholder(kind: "series" | "card", slug: string, title: string, subtitle: string, hue: number): string {
  const key = `catalog/seed-${kind}-${slug}.svg`;
  const w = kind === "card" ? 300 : 480;
  const h = kind === "card" ? 420 : 270;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,45%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},60%,18%)"/></linearGradient></defs>
<rect width="${w}" height="${h}" rx="18" fill="url(#g)"/>
<rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="12" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/>
<circle cx="${w / 2}" cy="${h * 0.4}" r="${Math.min(w, h) * 0.22}" fill="rgba(255,255,255,.14)"/>
<text x="${w / 2}" y="${h * 0.44}" text-anchor="middle" font-family="sans-serif" font-size="${kind === "card" ? 64 : 80}" font-weight="700" fill="rgba(255,255,255,.85)">${xml(title.charAt(0))}</text>
<text x="${w / 2}" y="${h - 62}" text-anchor="middle" font-family="sans-serif" font-size="${kind === "card" ? 24 : 30}" font-weight="700" fill="#fff">${xml(title)}</text>
<text x="${w / 2}" y="${h - 34}" text-anchor="middle" font-family="sans-serif" font-size="16" fill="rgba(255,255,255,.8)">${xml(subtitle)}</text>
</svg>`;
  mkdirSync(path.join(uploadDir, "catalog"), { recursive: true });
  writeFileSync(path.join(uploadDir, key), svg);
  return key;
}

const SERIES = [
  {
    name: "Naruto CCG Seri 1: Daun Tersembunyi",
    description: "Set pertama. Kenali para genin Konoha dan guru-guru yang membentuk mereka.",
    releaseDate: "2024-03-15",
    status: "PUBLISHED",
    hue: 28,
    cards: ["Naruto Uzumaki", "Sasuke Uchiha", "Sakura Haruno", "Kakashi Hatake", "Iruka Umino", "Hinata Hyuga", "Shikamaru Nara", "Choji Akimichi", "Ino Yamanaka", "Kiba Inuzuka", "Shino Aburame", "Rock Lee", "Neji Hyuga", "Rasengan|Jutsu", "Teknik Bunshin Bayangan|Jutsu", "Ujian Chunin|Misi"],
  },
  {
    name: "Naruto CCG Seri 2: Suara & Pasir",
    description: "Invasi ke Konoha. Empat Suara milik Orochimaru, kakak-beradik Pasir, dan para Sannin legendaris.",
    releaseDate: "2024-08-02",
    status: "PUBLISHED",
    hue: 275,
    cards: ["Orochimaru", "Kabuto Yakushi", "Kimimaro", "Dosu Kinuta", "Tsunade", "Jiraiya", "Gaara", "Temari", "Kankuro", "Hiruzen Sarutobi", "Zabuza Momochi", "Haku", "Chidori|Jutsu", "Peti Mati Pasir|Jutsu", "Pemanggilan: Gamabunta|Pemanggilan"],
  },
  {
    name: "Naruto CCG Seri 3: Bayangan Akatsuki",
    description: "Organisasi kriminal peringkat-S muncul. Setiap anggota, setiap rahasia.",
    releaseDate: "2025-01-24",
    status: "PUBLISHED",
    hue: 355,
    cards: ["Itachi Uchiha", "Kisame Hoshigaki", "Deidara", "Sasori", "Hidan", "Kakuzu", "Konan", "Pain", "Zetsu", "Tobi", "Amaterasu|Jutsu", "Sharingan Genjutsu|Jutsu", "Akatsuki Ring|Item"],
  },
  {
    name: "Naruto CCG Seri 4: Perang Dunia Shinobi",
    description: "Perang Dunia Shinobi Keempat. Lima Kage bersatu melawan Madara dan Obito.",
    releaseDate: "2025-09-12",
    status: "PUBLISHED",
    hue: 205,
    cards: ["Minato Namikaze", "Kushina Uzumaki", "Madara Uchiha", "Obito Uchiha", "Hashirama Senju", "Tobirama Senju", "Onoki", "Mei Terumi", "Killer B", "Yamato", "Sai", "Kurama|Pemanggilan", "Edo Tensei|Jutsu", "Kunai Generasi Keempat|Item", "Panji Aliansi|Dukungan"],
  },
  {
    name: "Naruto CCG Seri 5: Generasi Baru (Pratinjau)",
    description: "Seri draf, belum tampil di situs publik.",
    releaseDate: "2026-06-01",
    status: "DRAFT",
    hue: 140,
    cards: ["Boruto Uzumaki", "Sarada Uchiha", "Mitsuki", "Kawaki", "Konohamaru Sarutobi"],
  },
] as const;

const VILLAGES = ["Konoha", "Suna", "Kiri", "Kumo", "Iwa", "Oto", "Akatsuki"];
const ILLUSTRATORS = ["M. Kishida", "T. Aoyama", "R. Sato", "K. Mori", "Y. Hayashi"];

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length]!;
}

function attributesFor(type: string, i: number): { name: string; value: string }[] {
  const illustrator = { name: "Ilustrator", value: pick(ILLUSTRATORS, i) };
  switch (type) {
    case "Ninja":
      return [
        { name: "Chakra", value: String(1 + (i % 5)) },
        { name: "Serangan", value: String(1 + ((i * 3) % 6)) },
        { name: "Dukungan", value: String(1 + ((i * 2) % 4)) },
        { name: "Desa", value: pick(VILLAGES, i) },
        { name: "Efek", value: "Saat kartu ini masuk permainan, ambil 1 kartu. Sekali per giliran, bayar 1 Chakra untuk menambah Serangan sebesar 2." },
        illustrator,
      ];
    case "Jutsu":
      return [{ name: "Biaya Chakra", value: String(2 + (i % 4)) }, { name: "Efek", value: "Pilih satu Ninja Anda. Ninja itu mendapat +3 Serangan hingga akhir giliran." }, illustrator];
    case "Pemanggilan":
      return [{ name: "Biaya Chakra", value: String(4 + (i % 3)) }, { name: "Serangan", value: String(5 + (i % 3)) }, { name: "Efek", value: "Kembali ke tangan di akhir giliran." }, illustrator];
    case "Misi":
      return [{ name: "Hadiah", value: "Ambil 2 kartu" }, { name: "Syarat", value: "Kuasai 3 Ninja dari desa yang sama" }, illustrator];
    default:
      return [{ name: "Efek", value: "Pasang pada seorang Ninja. Ninja tersebut mendapat +1 Dukungan." }, illustrator];
  }
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: { username: "admin", email: adminEmail, passwordHash: await hashPassword(adminPassword), role: "ADMIN" },
  });
  const demo = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { username: "demo_user", email: userEmail, passwordHash: await hashPassword(userPassword), role: "USER" },
  });

  // Rarity ranking, highest first (RARITIES is listed lowest -> highest).
  for (const [i, name] of [...RARITIES].reverse().entries()) {
    await prisma.rarity.upsert({ where: { name }, update: {}, create: { name, sortOrder: i + 1 } });
  }

  const cardIds: string[] = [];
  for (const [si, s] of SERIES.entries()) {
    const slug = `naruto-ccg-series-${si + 1}`;
    const series = await prisma.series.upsert({
      where: { slug },
      update: { code: `S${si + 1}` },
      create: {
        name: s.name,
        slug,
        code: `S${si + 1}`,
        description: s.description,
        releaseDate: new Date(`${s.releaseDate}T00:00:00.000Z`),
        status: s.status,
        image: placeholder("series", slug, `Seri ${si + 1}`, s.name.split(": ")[1] ?? s.name, s.hue),
      },
    });

    for (const [ci, entry] of s.cards.entries()) {
      const [name, typeOverride] = entry.split("|") as [string, string | undefined];
      const type = typeOverride ?? "Ninja";
      if (!(CARD_TYPES as readonly string[]).includes(type)) throw new Error(`bad type ${type}`);
      // Mostly commons, a few rarer cards, at least one of each rarity per full series.
      const rarity = ci === 0 ? "Ultra Langka" : ci === 1 ? "Super Langka" : ci === 2 ? "Langka Rahasia" : pick(RARITIES, ci * 2 + si);
      const number = String(ci + 1).padStart(3, "0");
      const cardSlug = slugify(`${name} ${number} s${si + 1}`);
      // Draft card inside a published series to exercise visibility rules.
      const status = s.status === "PUBLISHED" && si === 0 && ci === s.cards.length - 1 ? "DRAFT" : s.status;
      const card = await prisma.card.upsert({
        where: { slug: cardSlug },
        update: {},
        create: {
          seriesId: series.id,
          cardNumber: number,
          name,
          slug: cardSlug,
          description: `${name} dari ${s.name.split(":")[0]}.`,
          rarity,
          cardType: type,
          status,
          image: placeholder("card", cardSlug, name, `#${number} · ${rarity}`, s.hue + ci * 7),
          attributes: { create: attributesFor(type, ci + si).map((a, i) => ({ ...a, sortOrder: i })) },
        },
      });
      if (card.status === "PUBLISHED") cardIds.push(card.id);
    }
  }

  // Demo wishlist & collection for the normal user.
  for (const cardId of cardIds.slice(5, 9)) {
    await prisma.wishlistItem.upsert({ where: { userId_cardId: { userId: demo.id, cardId } }, update: {}, create: { userId: demo.id, cardId } });
  }
  const owned = [
    { idx: 0, quantity: 3, buy: 500, sell: 1000 },
    { idx: 1, quantity: 1, buy: 1200, sell: 2500 },
    { idx: 2, quantity: 2, buy: 300, sell: 450 },
    { idx: 16, quantity: 1, buy: 800, sell: 1500 },
  ];
  for (const o of owned) {
    const cardId = cardIds[o.idx];
    if (!cardId) continue;
    await prisma.collectionItem.upsert({
      where: { userId_cardId: { userId: demo.id, cardId } },
      update: {},
      create: { userId: demo.id, cardId, quantity: o.quantity, buyPrice: o.buy, sellPrice: o.sell, notes: "Data contoh" },
    });
  }

  console.log(`Seeded ${SERIES.length} series, ${cardIds.length} published cards.`);
  console.log(`Admin: ${admin.email}  |  User: ${demo.email}  (passwords: see README / .env)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
