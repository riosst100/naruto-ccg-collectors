"use server";

import { redirect } from "next/navigation";
import { checkLoginThrottle, clearLoginFailures, clientKey, recordLoginFailure } from "@naruto-ccg/auth";
import {
  burnPasswordCheck,
  createUser,
  findUserWithHashByEmail,
  guard,
  hashPassword,
  verifyPassword,
} from "@naruto-ccg/database";
import { failure, fieldErrors, loginSchema, registerSchema, type ActionState } from "@naruto-ccg/shared";
import { createSession, deleteSession } from "../auth";
import { safeNext } from "../urls";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function registerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    username: str(fd, "username"),
    email: str(fd, "email"),
    password: str(fd, "password"),
    confirmPassword: str(fd, "confirmPassword"),
  });
  if (!parsed.success) return failure("Perbaiki kolom yang ditandai.", fieldErrors(parsed.error));

  const result = await guard(async () => {
    const user = await createUser({
      username: parsed.data.username,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    });
    await createSession(user.id, { remember: true });
    return { ok: true };
  });
  if (!result.ok) return result;
  redirect(safeNext(str(fd, "next")));
}

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password"), remember: fd.get("remember") === "on" });
  if (!parsed.success) return failure("Masukkan email dan kata sandi yang valid.", fieldErrors(parsed.error));
  const { email, password, remember } = parsed.data;

  const key = await clientKey(email);
  if (!checkLoginThrottle(key)) return failure("Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.");

  const user = await findUserWithHashByEmail(email);
  // Same generic error for unknown email, wrong password and disabled accounts.
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);
  if (!user || !valid || user.status !== "ACTIVE") {
    recordLoginFailure(key);
    return failure("Email atau kata sandi salah.");
  }
  clearLoginFailures(key);
  await createSession(user.id, { remember });
  redirect(safeNext(str(fd, "next")));
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/");
}
