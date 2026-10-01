import "server-only";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { cardSchema, CARD_TYPES, PUBLISH_STATUSES, slugSchema, STATUS_LABEL } from "@naruto-ccg/shared";
import type { CardImportRow } from "@naruto-ccg/database";

export type SheetFormat = "xlsx" | "csv";

/**
 * File layout. The first five columns are the catalog format used by the data source
 * (card_name, card_number, card_series_number, card_rarity, card_images); the rest are optional extras.
 */
export const HEADERS = [
  "card_name",
  "card_number",
  "card_series_number",
  "card_rarity",
  "card_images",
  "card_type",
  "card_status",
  "card_description",
  "card_slug",
  "card_attributes",
] as const;
const REQUIRED = ["card_name", "card_number", "card_series_number", "card_rarity"] as const;
export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const DEFAULT_TYPE = "Ninja";

interface ExportCard {
  cardNumber: string;
  name: string;
  slug: string;
  rarity: string;
  cardType: string;
  status: string;
  description: string | null;
  image: string | null;
  series: { slug: string; code: string | null };
  attributes: { name: string; value: string }[];
}

/** Always contains the header row, even when there are no cards (so the file doubles as an import template). */
export async function buildCardsFile(cards: ExportCard[], format: SheetFormat): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Kartu");
  const widths = [30, 22, 20, 14, 60, 14, 16, 40, 34, 44];
  ws.columns = HEADERS.map((h, i) => ({ header: h, key: h, width: widths[i] }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.getColumn("card_number").numFmt = "@"; // keep leading zeros as text

  for (const c of cards) {
    ws.addRow({
      card_name: c.name,
      card_number: c.cardNumber,
      card_series_number: c.series.code ?? c.series.slug,
      card_rarity: c.rarity,
      // Only remote URLs are exported; files uploaded to local storage have no public URL outside this site.
      card_images: c.image && /^https?:\/\//i.test(c.image) ? c.image : "",
      card_type: c.cardType,
      card_status: STATUS_LABEL[c.status] ?? c.status,
      card_description: c.description ?? "",
      card_slug: c.slug,
      card_attributes: c.attributes.map((a) => `${a.name}: ${a.value}`).join("\n"),
    });
  }
  ws.getColumn("card_attributes").alignment = { wrapText: true, vertical: "top" };

  if (format === "csv") {
    const csv = Buffer.from(await wb.csv.writeBuffer());
    return Buffer.concat([Buffer.from("﻿", "utf8"), csv]); // BOM so Excel reads UTF-8 correctly
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("").trim();
    if ("hyperlink" in v && "text" in v) return cellText(v.text as ExcelJS.CellValue) || String(v.hyperlink);
    if ("result" in v && v.result != null) return cellText(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text).trim();
  }
  return "";
}

const norm = (s: string) => s.trim().toLowerCase();

function pickType(raw: string): (typeof CARD_TYPES)[number] | undefined {
  return raw === "" ? DEFAULT_TYPE : CARD_TYPES.find((o) => norm(o) === norm(raw));
}

export interface ParseResult {
  rows: CardImportRow[];
  errors: string[];
}

export async function parseCardsFile(buffer: Buffer, format: SheetFormat, opts: { publish: boolean }): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  try {
    if (format === "csv") {
      const text = buffer.toString("utf8").replace(/^﻿/, "");
      // map: keep every value a string (default parsing would turn "001" into 1)
      await wb.csv.read(Readable.from([text]), { map: (v: unknown) => v as string });
    } else {
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    }
  } catch {
    return { rows: [], errors: ["File tidak dapat dibaca. Pastikan formatnya XLSX atau CSV yang valid."] };
  }
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], errors: ["File tidak memiliki lembar data."] };

  const col = new Map<string, number>();
  ws.getRow(1).eachCell((cell, n) => col.set(norm(cellText(cell.value)), n));
  const missing = REQUIRED.filter((h) => !col.has(h));
  if (missing.length) return { rows: [], errors: [`Kolom wajib tidak ditemukan: ${missing.join(", ")}.`] };
  const get = (row: ExcelJS.Row, h: string) => (col.has(h) ? cellText(row.getCell(col.get(h)!).value) : "");

  const errors: string[] = [];
  const rows: CardImportRow[] = [];
  const seen = new Set<string>();
  let dataRows = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (HEADERS.every((h) => get(row, h) === "")) continue; // blank line
    if (++dataRows > MAX_IMPORT_ROWS) {
      errors.push(`Maksimal ${MAX_IMPORT_ROWS} baris per impor.`);
      break;
    }
    const fail = (msg: string) => errors.push(`Baris ${r}: ${msg}`);

    const seriesCode = get(row, "card_series_number");
    const cardNumber = get(row, "card_number");
    const cardType = pickType(get(row, "card_type"));
    const statusRaw = get(row, "card_status");
    const status =
      statusRaw === ""
        ? opts.publish
          ? "PUBLISHED"
          : "DRAFT"
        : PUBLISH_STATUSES.find((s) => norm(s) === norm(statusRaw) || norm(STATUS_LABEL[s] ?? "") === norm(statusRaw));
    const slugRaw = get(row, "card_slug").toLowerCase();

    if (!seriesCode) fail("card_series_number wajib diisi.");
    if (!cardType) fail(`card_type tidak valid "${get(row, "card_type")}". Pilihan: ${CARD_TYPES.join(", ")}.`);
    if (!status) fail(`card_status tidak valid "${statusRaw}". Gunakan Draf atau Dipublikasikan.`);
    if (slugRaw && !slugSchema.safeParse(slugRaw).success) fail(`card_slug tidak valid "${slugRaw}".`);

    const key = `${seriesCode.toLowerCase()}|${cardNumber}`;
    if (seen.has(key)) fail(`card_number ${cardNumber} muncul dua kali untuk seri ${seriesCode}.`);
    seen.add(key);

    const attributes: { name: string; value: string }[] = [];
    for (const line of get(row, "card_attributes").split(/\r?\n/)) {
      if (line.trim() === "") continue;
      const i = line.indexOf(":");
      if (i < 1) {
        fail(`Atribut "${line.trim()}" harus berformat "Nama: Nilai".`);
        continue;
      }
      attributes.push({ name: line.slice(0, i).trim(), value: line.slice(i + 1).trim() });
    }

    if (!cardType || !status || !seriesCode) continue;
    const parsed = cardSchema.safeParse({
      seriesId: "pending",
      cardNumber,
      name: get(row, "card_name"),
      slug: slugRaw || "placeholder",
      description: get(row, "card_description"),
      rarity: get(row, "card_rarity"),
      image: get(row, "card_images"),
      cardType,
      status,
      attributes,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.push(`Baris ${r}: ${issue.path.join(".") || "data"} — ${issue.message}`);
      continue;
    }
    const { slug: _slug, seriesId: _sid, image, ...data } = parsed.data;
    void _slug;
    void _sid;
    rows.push({ ...data, image: image ?? null, slug: slugRaw || null, seriesCode, line: r });
  }
  if (dataRows === 0 && errors.length === 0) errors.push("Tidak ada data kartu di file.");
  return { rows, errors };
}
