"use server";

import { revalidatePath } from "next/cache";
import { addToWishlist, guard, removeFromWishlist } from "@naruto-ccg/database";
import { failure, success, type ActionState } from "@naruto-ccg/shared";
import { requireUser } from "../auth";

function cardIdOf(fd: FormData): string | null {
  const v = fd.get("cardId");
  return typeof v === "string" && v.length > 0 && v.length < 64 ? v : null;
}

export async function addToWishlistAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const cardId = cardIdOf(fd);
  if (!cardId) return failure("Kartu tidak valid.");
  return guard(async () => {
    await addToWishlist(user.id, cardId);
    revalidatePath("/", "layout");
    return success("Ditambahkan ke wishlist");
  });
}

export async function removeFromWishlistAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const cardId = cardIdOf(fd);
  if (!cardId) return failure("Kartu tidak valid.");
  await removeFromWishlist(user.id, cardId);
  revalidatePath("/", "layout");
  return success("Dihapus dari wishlist");
}
