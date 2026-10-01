-- Rarity ranking: sortOrder 1 = highest rarity.
CREATE TABLE "Rarity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Rarity_name_key" ON "Rarity"("name");
CREATE INDEX "Rarity_sortOrder_idx" ON "Rarity"("sortOrder");

-- Seed from rarities already used by cards; known names get a sensible high -> low order, the rest follow alphabetically.
INSERT INTO "Rarity" ("id", "name", "sortOrder")
SELECT 'r' || lower(hex(randomblob(10))), "rarity",
       ROW_NUMBER() OVER (ORDER BY CASE "rarity"
         WHEN 'Langka Rahasia' THEN 0 WHEN 'Ultra Langka' THEN 1 WHEN 'Super Langka' THEN 2
         WHEN 'Langka' THEN 3 WHEN 'Tidak Umum' THEN 4 WHEN 'Umum' THEN 5 ELSE 99 END, "rarity")
FROM (SELECT DISTINCT "rarity" FROM "Card");
