"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStorage, saveImage, UploadError } from "@naruto-ccg/storage";
import {
  adminCardIds,
  adminGetCard,
  adminGetSeries,
  createCard,
  createSeries,
  deleteCard,
  deleteCardsBulk,
  deleteSeries,
  guard,
  ServiceError,
  setCardStatus,
  setCardsStatusBulk,
  setSeriesStatus,
  updateCard,
  updateSeries,
  upsertCardsBulk,
} from "@naruto-ccg/database";
import { cardSchema, failure, fieldErrors, PUBLISH_STATUSES, seriesSchema, success, type ActionState } from "@naruto-ccg/shared";
import { requireAdmin } from "../auth";
import { MAX_IMPORT_BYTES, parseCardsFile } from "../cards-sheet";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const refresh = () => revalidatePath("/", "layout");
const dropFile = (key: string | null | undefined) => (key ? getStorage().delete(key).catch(() => undefined) : Promise.resolve());

/** Resolves the image field: undefined = keep current, null = remove, string = newly stored key. */
async function readImage(fd: FormData): Promise<string | null | undefined> {
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) return saveImage("catalog", file);
  if (fd.get("removeImage") === "on") return null;
  return undefined;
}

// ---------- series ----------

function seriesFields(fd: FormData) {
  return {
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    code: str(fd, "code"),
    description: str(fd, "description"),
    releaseDate: str(fd, "releaseDate"),
    status: str(fd, "status"),
  };
}

export async function createSeriesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = seriesSchema.safeParse(seriesFields(fd));
  if (!parsed.success) return failure("Perbaiki kolom yang ditandai.", fieldErrors(parsed.error));

  let newImage: string | null | undefined;
  const result = await guard(async () => {
    try {
      newImage = await readImage(fd);
    } catch (e) {
      if (e instanceof UploadError) throw new ServiceError(e.message, "image");
      throw e;
    }
    try {
      await createSeries(parsed.data, newImage ?? null);
    } catch (e) {
      await dropFile(newImage);
      throw e;
    }
    refresh();
    return success();
  });
  if (!result.ok) return result;
  redirect("/series");
}

export async function updateSeriesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(fd, "id");
  const parsed = seriesSchema.safeParse(seriesFields(fd));
  if (!parsed.success) return failure("Perbaiki kolom yang ditandai.", fieldErrors(parsed.error));

  return guard(async () => {
    const current = await adminGetSeries(id);
    if (!current) throw new ServiceError("Seri tidak ditemukan.");
    let newImage: string | null | undefined;
    try {
      newImage = await readImage(fd);
    } catch (e) {
      if (e instanceof UploadError) throw new ServiceError(e.message, "image");
      throw e;
    }
    try {
      await updateSeries(id, parsed.data, newImage);
    } catch (e) {
      if (typeof newImage === "string") await dropFile(newImage);
      throw e;
    }
    if (newImage !== undefined) await dropFile(current.image);
    refresh();
    return success("Seri disimpan");
  });
}

export async function setSeriesStatusAction(fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const status = str(fd, "status");
  if (!(PUBLISH_STATUSES as readonly string[]).includes(status)) return failure("Status tidak valid.");
  return guard(async () => {
    await setSeriesStatus(str(fd, "id"), status as "DRAFT" | "PUBLISHED");
    refresh();
    return success(status === "PUBLISHED" ? "Seri dipublikasikan" : "Publikasi seri dibatalkan");
  });
}

export async function deleteSeriesAction(fd: FormData): Promise<ActionState> {
  await requireAdmin();
  return guard(async () => {
    const { imageKeys, cards } = await deleteSeries(str(fd, "id"));
    await Promise.all(imageKeys.map(dropFile));
    refresh();
    return success(cards > 0 ? `Seri dan ${cards} kartunya dihapus` : "Seri dihapus");
  });
}

// ---------- cards ----------

function cardFields(fd: FormData) {
  const names = fd.getAll("attrName").map(String);
  const values = fd.getAll("attrValue").map(String);
  const attributes = names
    .map((name, i) => ({ name: name.trim(), value: (values[i] ?? "").trim() }))
    .filter((a) => a.name !== "" || a.value !== ""); // ignore fully blank rows; half-filled rows fail validation
  return {
    seriesId: str(fd, "seriesId"),
    cardNumber: str(fd, "cardNumber"),
    name: str(fd, "name"),
    slug: str(fd, "slug"),
    description: str(fd, "description"),
    rarity: str(fd, "rarity"),
    cardType: str(fd, "cardType"),
    status: str(fd, "status"),
    attributes,
  };
}

function cardErrors(error: Parameters<typeof fieldErrors>[0]) {
  const errs = fieldErrors(error);
  // attributes.2.value -> attributes (one banner message)
  for (const k of Object.keys(errs)) if (k.startsWith("attributes.")) errs.attributes = `Setiap atribut harus memiliki nama dan nilai (${errs[k]}).`;
  return errs;
}

export async function createCardAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = cardSchema.safeParse(cardFields(fd));
  if (!parsed.success) return failure("Perbaiki kolom yang ditandai.", cardErrors(parsed.error));

  const result = await guard(async () => {
    let newImage: string | null | undefined;
    try {
      newImage = await readImage(fd);
    } catch (e) {
      if (e instanceof UploadError) throw new ServiceError(e.message, "image");
      throw e;
    }
    try {
      await createCard(parsed.data, newImage ?? null);
    } catch (e) {
      await dropFile(newImage);
      throw e;
    }
    refresh();
    return success();
  });
  if (!result.ok) return result;
  redirect("/cards");
}

export async function updateCardAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(fd, "id");
  const parsed = cardSchema.safeParse(cardFields(fd));
  if (!parsed.success) return failure("Perbaiki kolom yang ditandai.", cardErrors(parsed.error));

  return guard(async () => {
    const current = await adminGetCard(id);
    if (!current) throw new ServiceError("Kartu tidak ditemukan.");
    let newImage: string | null | undefined;
    try {
      newImage = await readImage(fd);
    } catch (e) {
      if (e instanceof UploadError) throw new ServiceError(e.message, "image");
      throw e;
    }
    try {
      await updateCard(id, parsed.data, newImage);
    } catch (e) {
      if (typeof newImage === "string") await dropFile(newImage);
      throw e;
    }
    if (newImage !== undefined) await dropFile(current.image);
    refresh();
    return success("Kartu disimpan");
  });
}

export async function setCardStatusAction(fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const status = str(fd, "status");
  if (!(PUBLISH_STATUSES as readonly string[]).includes(status)) return failure("Status tidak valid.");
  return guard(async () => {
    await setCardStatus(str(fd, "id"), status as "DRAFT" | "PUBLISHED");
    refresh();
    return success(status === "PUBLISHED" ? "Kartu dipublikasikan" : "Publikasi kartu dibatalkan");
  });
}

export async function deleteCardAction(fd: FormData): Promise<ActionState> {
  await requireAdmin();
  return guard(async () => {
    const { result, image } = await deleteCard(str(fd, "id"));
    await dropFile(image);
    refresh();
    return success(result === "archived" ? "Kartu diarsipkan (masih dimiliki pengguna, sehingga disimpan untuk koleksi mereka)" : "Kartu dihapus");
  });
}

// ---------- import ----------

export async function importCardsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return failure("Pilih file XLSX atau CSV.");
  if (file.size > MAX_IMPORT_BYTES) return failure("Ukuran file maksimal 5 MB.");
  const publish = fd.get("publish") === "on";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "xlsx" && ext !== "csv") return failure("Hanya file .xlsx atau .csv yang diterima.");

  const { rows, errors } = await parseCardsFile(Buffer.from(await file.arrayBuffer()), ext, { publish });
  if (errors.length > 0) {
    const shown = errors.slice(0, 15).join("\n");
    const more = errors.length > 15 ? `\n…dan ${errors.length - 15} kesalahan lain.` : "";
    return failure(`Impor dibatalkan, tidak ada data yang disimpan:\n${shown}${more}`);
  }
  return guard(async () => {
    const { created, updated, seriesCreated } = await upsertCardsBulk(rows, { publishSeries: publish });
    refresh();
    const extra = seriesCreated.length ? `; ${seriesCreated.length} seri baru dibuat (${seriesCreated.slice(0, 5).join(", ")}${seriesCreated.length > 5 ? ", …" : ""})` : "";
    return success(`Impor selesai: ${created} kartu baru, ${updated} diperbarui${extra}`);
  });
}

// ---------- bulk actions ----------

const MAX_BULK = 20000;

/**
 * op: publish | unpublish | delete.
 * Targets are either explicit ids (comma separated) or every card matching the posted filters.
 * Targets are always resolved on the server, never trusted from the client beyond ids/filters.
 */
export async function bulkCardsAction(fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const op = str(fd, "op");
  if (op !== "publish" && op !== "unpublish" && op !== "delete") return failure("Aksi tidak valid.");

  const ids =
    str(fd, "mode") === "filter"
      ? await adminCardIds({ q: str(fd, "q") || undefined, seriesId: str(fd, "seriesId") || undefined, rarity: str(fd, "rarity") || undefined, cardType: str(fd, "cardType") || undefined, status: str(fd, "status") || undefined })
      : str(fd, "ids").split(",").filter((x) => x.length > 0 && x.length < 64);
  if (ids.length === 0) return failure("Tidak ada kartu yang dipilih.");
  if (ids.length > MAX_BULK) return failure(`Maksimal ${MAX_BULK} kartu per aksi.`);

  return guard(async () => {
    if (op === "delete") {
      const { deleted, archived, images } = await deleteCardsBulk(ids);
      await Promise.all(images.map(dropFile));
      refresh();
      const parts = [deleted ? `${deleted} kartu dihapus` : "", archived ? `${archived} kartu diarsipkan (dimiliki pengguna)` : ""].filter(Boolean);
      return success(parts.join(", ") || "Tidak ada perubahan");
    }
    const n = await setCardsStatusBulk(ids, op === "publish" ? "PUBLISHED" : "DRAFT");
    refresh();
    return success(op === "publish" ? `${n} kartu dipublikasikan` : `Publikasi ${n} kartu dibatalkan`);
  });
}
