"use server";

import { revalidatePath } from "next/cache";
import { guard, setUserRole, setUserStatus } from "@naruto-ccg/database";
import { failure, roleSchema, success, USER_STATUSES, type ActionState } from "@naruto-ccg/shared";
import { requireAdmin } from "../auth";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

// NOTE: admins can change a user's role/status only. Collection and wishlist data is read-only here by design.

export async function setRoleAction(fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const role = roleSchema.safeParse(str(fd, "role"));
  if (!role.success) return failure("Peran tidak valid.");
  return guard(async () => {
    await setUserRole(admin.id, str(fd, "userId"), role.data);
    revalidatePath("/", "layout");
    return success(`Peran diubah menjadi ${role.data}`);
  });
}

export async function setStatusAction(fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const status = str(fd, "status");
  if (!(USER_STATUSES as readonly string[]).includes(status)) return failure("Status tidak valid.");
  return guard(async () => {
    await setUserStatus(admin.id, str(fd, "userId"), status as (typeof USER_STATUSES)[number]);
    revalidatePath("/", "layout");
    return success(status === "DISABLED" ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan");
  });
}
