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
import { localizeState } from "../i18n/messages";
import { getDictionary, getLocale } from "../i18n/server";
import { safeNext } from "../urls";

const str = (fd: FormData, k: string) => (typeof fd.get(k) === "string" ? (fd.get(k) as string) : "");

export async function registerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const parsed = registerSchema.safeParse({
    username: str(fd, "username"),
    email: str(fd, "email"),
    password: str(fd, "password"),
    confirmPassword: str(fd, "confirmPassword"),
  });
  if (!parsed.success) return localizeState(failure(t.auth.fixFields, fieldErrors(parsed.error)), locale);

  const result = await guard(async () => {
    const user = await createUser({
      username: parsed.data.username,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    });
    await createSession(user.id, { remember: true });
    return { ok: true };
  });
  if (!result.ok) return localizeState(result, locale);
  redirect(safeNext(str(fd, "next")));
}

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const parsed = loginSchema.safeParse({ email: str(fd, "email"), password: str(fd, "password"), remember: fd.get("remember") === "on" });
  if (!parsed.success) return localizeState(failure(t.auth.invalidLogin, fieldErrors(parsed.error)), locale);
  const { email, password, remember } = parsed.data;

  const key = await clientKey(email);
  if (!checkLoginThrottle(key)) return failure(t.auth.throttled);

  const user = await findUserWithHashByEmail(email);
  // Same generic error for unknown email, wrong password and disabled accounts.
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);
  if (!user || !valid || user.status !== "ACTIVE") {
    recordLoginFailure(key);
    return failure(t.auth.wrongCredentials);
  }
  clearLoginFailures(key);
  await createSession(user.id, { remember });
  redirect(safeNext(str(fd, "next")));
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/");
}
