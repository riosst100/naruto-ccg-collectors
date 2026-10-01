import { adminExportCards } from "@naruto-ccg/database";
import { buildCardsFile } from "@/lib/cards-sheet";
import { getCurrentAdmin } from "@/lib/auth";

const one = (v: string | null) => v?.trim().slice(0, 100) || undefined;

// GET /admin/cards/export?format=xlsx|csv&q=&seriesId=&rarity=&cardType=&status=
export async function GET(req: Request) {
  // Route handlers are not covered by the panel layout: authorize here.
  if (!(await getCurrentAdmin())) return new Response("Unauthorized", { status: 401 });

  const sp = new URL(req.url).searchParams;
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  const cards = await adminExportCards({
    q: one(sp.get("q")),
    seriesId: one(sp.get("seriesId")),
    rarity: one(sp.get("rarity")),
    cardType: one(sp.get("cardType")),
    status: one(sp.get("status")),
  });
  const body = await buildCardsFile(cards, format);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kartu-naruto-ccg-${date}.${format}"`,
      "Cache-Control": "no-store",
    },
  });
}
