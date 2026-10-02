"use server";

import { revalidatePath } from "next/cache";
import { addToWishlist, guard, removeFromWishlist } from "@naruto-ccg/database";
import { failure, success, type ActionState } from "@naruto-ccg/shared";
import { requireUser } from "../auth";
import { localizeState } from "../i18n/messages";
import { getDictionary, getLocale } from "../i18n/server";

function cardIdOf(fd: FormData): string | null {
  const v = fd.get("cardId");
  return typeof v === "string" && v.length > 0 && v.length < 64 ? v : null;
}

export async function addToWishlistAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const cardId = cardIdOf(fd);
  if (!cardId) return failure(t.actions.invalidCard);
  const result = await guard(async () => {
    await addToWishlist(user.id, cardId);
    revalidatePath("/", "layout");
    return success(t.actions.addedWishlist);
  });
  return localizeState(result, locale);
}

export async function removeFromWishlistAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const t = await getDictionary();
  const cardId = cardIdOf(fd);
  if (!cardId) return failure(t.actions.invalidCard);
  await removeFromWishlist(user.id, cardId);
  revalidatePath("/", "layout");
  return success(t.actions.removedWishlist);
}
