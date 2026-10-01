-- Prices no longer carry a currency. Rows stored in cents (USD/EUR) are converted to whole units first.
UPDATE "CollectionItem" SET "buyPrice" = "buyPrice" / 100 WHERE "currency" IN ('USD', 'EUR') AND "buyPrice" IS NOT NULL;
UPDATE "CollectionItem" SET "sellPrice" = "sellPrice" / 100 WHERE "currency" IN ('USD', 'EUR') AND "sellPrice" IS NOT NULL;
ALTER TABLE "CollectionItem" DROP COLUMN "currency";
