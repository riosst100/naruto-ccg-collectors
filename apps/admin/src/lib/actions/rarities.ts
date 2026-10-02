"use server";

import { revalidatePath } from "next/cache";
import { createRarity, deleteRarity, guard, moveRarity, renameRarity } from "@naruto-ccg/database";
import { failure, success, type ActionState } from "@naruto-ccg/shared";
import { requireAdmin } from "../auth";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");
const refresh = () => revalidatePath("/", "layout");

export async function createRarityAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  return guard(async () => {
    await createRarity(str(fd, "name"), str(fd, "label"));
    refresh();
    return success("Kelangkaan ditambahkan (di peringkat terendah)");
  });
}

export async function renameRarityAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  return guard(async () => {
    await renameRarity(str(fd, "id"), str(fd, "name"), str(fd, "label"));
    refresh();
    return success("Kelangkaan diperbarui (kartu terkait ikut memakai kode baru)");
  });
}

export async function moveRarityAction(fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const dir = str(fd, "dir");
  if (dir !== "up" && dir !== "down") return failure("Arah tidak valid.");
  return guard(async () => {
    await moveRarity(str(fd, "id"), dir);
    refresh();
    return { ok: true };
  });
}

export async function deleteRarityAction(fd: FormData): Promise<ActionState> {
  await requireAdmin();
  return guard(async () => {
    await deleteRarity(str(fd, "id"));
    refresh();
    return success("Kelangkaan dihapus");
  });
}
