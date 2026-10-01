"use server";

import { revalidatePath } from "next/cache";
import { getStorage, saveImage, UploadError } from "@naruto-ccg/storage";
import {
  addCollectionImage,
  addToCollection,
  adjustCollectionQuantity,
  countCollectionImages,
  guard,
  removeCollectionImage,
  removeFromCollection,
  updateCollectionItem,
} from "@naruto-ccg/database";
import {
  addToCollectionSchema,
  failure,
  fieldErrors,
  success,
  UPLOAD_LIMITS,
  updateCollectionSchema,
  type ActionState,
} from "@naruto-ccg/shared";
import { requireUser } from "../auth";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const refresh = () => revalidatePath("/", "layout");

function collectionFields(fd: FormData) {
  return {
    quantity: str(fd, "quantity"),
    buyPrice: str(fd, "buyPrice"),
    sellPrice: str(fd, "sellPrice"),
    notes: str(fd, "notes"),
  };
}

export async function addToCollectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = addToCollectionSchema.safeParse({ cardId: str(fd, "cardId"), ...collectionFields(fd) });
  if (!parsed.success) return failure("Perbaiki kolom yang ditandai.", fieldErrors(parsed.error));
  return guard(async () => {
    await addToCollection(user.id, parsed.data.cardId, parsed.data);
    refresh();
    return success("Ditambahkan ke koleksi");
  });
}

export async function updateCollectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateCollectionSchema.safeParse({ itemId: str(fd, "itemId"), ...collectionFields(fd) });
  if (!parsed.success) return failure("Perbaiki kolom yang ditandai.", fieldErrors(parsed.error));
  return guard(async () => {
    await updateCollectionItem(user.id, parsed.data.itemId, parsed.data);
    refresh();
    return success("Item koleksi diperbarui");
  });
}

export async function adjustQuantityAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const delta = Number(str(fd, "delta"));
  if (delta !== 1 && delta !== -1) return failure("Perubahan tidak valid.");
  return guard(async () => {
    await adjustCollectionQuantity(user.id, str(fd, "itemId"), delta);
    refresh();
    return { ok: true };
  });
}

export async function removeFromCollectionAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const { imageKeys } = await removeFromCollection(user.id, str(fd, "itemId"));
    await Promise.all(imageKeys.map((k) => getStorage().delete(k).catch(() => undefined)));
    refresh();
    return success("Dihapus dari koleksi");
  });
}

export async function uploadImagesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const itemId = str(fd, "itemId");
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return failure("Pilih minimal satu gambar.");

  return guard(async () => {
    const existing = await countCollectionImages(user.id, itemId); // also proves ownership
    if (existing + files.length > UPLOAD_LIMITS.maxImagesPerCollectionItem) {
      return failure(`Maksimal ${UPLOAD_LIMITS.maxImagesPerCollectionItem} gambar per kartu.`);
    }
    let saved = 0;
    for (const file of files) {
      let key: string | null = null;
      try {
        key = await saveImage(`collections/${user.id}`, file);
        await addCollectionImage(user.id, itemId, key);
        saved++;
      } catch (e) {
        if (key) await getStorage().delete(key).catch(() => undefined);
        refresh();
        if (e instanceof UploadError) return failure(`${file.name}: ${e.message}`);
        throw e;
      }
    }
    refresh();
    return success(saved === 1 ? "Gambar diunggah" : `${saved} gambar diunggah`);
  });
}

export async function deleteImageAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  return guard(async () => {
    const { key } = await removeCollectionImage(user.id, str(fd, "imageId"));
    await getStorage().delete(key).catch(() => undefined);
    refresh();
    return success("Gambar dihapus");
  });
}
