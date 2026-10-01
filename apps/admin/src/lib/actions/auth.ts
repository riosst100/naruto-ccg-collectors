"use server";

import { redirect } from "next/navigation";
import { checkLoginThrottle, clearLoginFailures, clientKey, recordLoginFailure } from "@naruto-ccg/auth";
import {
  burnPasswordCheck,
  deleteUserSessions,
  findUserWithHashById,
  findUserWithHashByEmail,
  guard,
  hashPassword,
  updatePasswordHash,
  verifyPassword,
} from "@naruto-ccg/database";
import { changePasswordSchema, failure, fieldErrors, loginSchema, success, type ActionState } from "@naruto-ccg/shared";
import { createSession, currentTokenHash, deleteSession, requireAdmin } from "../auth";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function adminLoginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password"), remember: false });
  if (!parsed.success) return failure("Masukkan email dan kata sandi yang valid.", fieldErrors(parsed.error));
  const { email, password } = parsed.data;

  const key = await clientKey(email);
  if (!checkLoginThrottle(key)) return failure("Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.");

  const user = await findUserWithHashByEmail(email);
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);
  // Non-admins get the same message as a wrong password: the admin site does not reveal who is an admin.
  if (!user || !valid || user.status !== "ACTIVE" || user.role !== "ADMIN") {
    recordLoginFailure(key);
    return failure("Email atau kata sandi salah.");
  }
  clearLoginFailures(key);
  await createSession(user.id);
  redirect("/");
}

export async function adminLogoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

export async function changePasswordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: str(fd, "currentPassword"),
    newPassword: str(fd, "newPassword"),
    confirmPassword: str(fd, "confirmPassword"),
  });
  if (!parsed.success) return failure("Perbaiki kolom yang ditandai.", fieldErrors(parsed.error));
  return guard(async () => {
    const full = await findUserWithHashById(admin.id);
    if (!full || !(await verifyPassword(parsed.data.currentPassword, full.passwordHash))) {
      return failure("Kata sandi saat ini salah.", { currentPassword: "Kata sandi salah" });
    }
    await updatePasswordHash(admin.id, await hashPassword(parsed.data.newPassword));
    await deleteUserSessions(admin.id, await currentTokenHash()); // sign out every other device
    return success("Kata sandi diubah");
  });
}
