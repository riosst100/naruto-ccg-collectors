ALTER TABLE "Series" ADD COLUMN "code" TEXT;

CREATE UNIQUE INDEX "Series_code_key" ON "Series"("code");
