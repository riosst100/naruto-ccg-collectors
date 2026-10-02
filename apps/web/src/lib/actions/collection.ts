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
import { localizeState, translateMessage } from "../i18n/messages";
import { getDictionary, getLocale } from "../i18n/server";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const refresh = () => revalidatePath("/", "layout");
const i18n = async () => {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  return { locale, t, localize: (state: NonNullable<ActionState>) => localizeState(state, locale) };
};

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
  const { t, localize } = await i18n();
  const parsed = addToCollectionSchema.safeParse({ cardId: str(fd, "cardId"), ...collectionFields(fd) });
  if (!parsed.success) return localize(failure(t.auth.fixFields, fieldErrors(parsed.error)));
  const result = await guard(async () => {
    await addToCollection(user.id, parsed.data.cardId, parsed.data);
    refresh();
    return success(t.collection.added);
  });
  return localize(result);
}

export async function updateCollectionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t, localize } = await i18n();
  const parsed = updateCollectionSchema.safeParse({ itemId: str(fd, "itemId"), ...collectionFields(fd) });
  if (!parsed.success) return localize(failure(t.auth.fixFields, fieldErrors(parsed.error)));
  const result = await guard(async () => {
    await updateCollectionItem(user.id, parsed.data.itemId, parsed.data);
    refresh();
    return success(t.collection.updated);
  });
  return localize(result);
}

export async function adjustQuantityAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t, localize } = await i18n();
  const delta = Number(str(fd, "delta"));
  if (delta !== 1 && delta !== -1) return failure(t.collection.invalidChange);
  const result = await guard(async () => {
    await adjustCollectionQuantity(user.id, str(fd, "itemId"), delta);
    refresh();
    return { ok: true };
  });
  return localize(result);
}

export async function removeFromCollectionAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t, localize } = await i18n();
  const result = await guard(async () => {
    const { imageKeys } = await removeFromCollection(user.id, str(fd, "itemId"));
    await Promise.all(imageKeys.map((k) => getStorage().delete(k).catch(() => undefined)));
    refresh();
    return success(t.collection.removed);
  });
  return localize(result);
}

export async function uploadImagesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const itemId = str(fd, "itemId");
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  const { locale, t, localize } = await i18n();
  if (files.length === 0) return failure(t.images.pickOne);

  const result = await guard(async () => {
    const existing = await countCollectionImages(user.id, itemId); // also proves ownership
    if (existing + files.length > UPLOAD_LIMITS.maxImagesPerCollectionItem) {
      return failure(`Maksimal ${UPLOAD_LIMITS.maxImagesPerCollectionItem} gambar per kartu.`); // translated by localize()
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
        if (e instanceof UploadError) return failure(`${file.name}: ${translateMessage(e.message, locale)}`);
        throw e;
      }
    }
    refresh();
    return success(t.images.uploaded(saved));
  });
  return localize(result);
}

export async function deleteImageAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { t, localize } = await i18n();
  const result = await guard(async () => {
    const { key } = await removeCollectionImage(user.id, str(fd, "imageId"));
    await getStorage().delete(key).catch(() => undefined);
    refresh();
    return success(t.images.deleted);
  });
  return localize(result);
}
