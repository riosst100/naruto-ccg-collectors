import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionRecord,
  deleteSessionByHash,
  findActiveSession,
  type SafeUser,
} from "@naruto-ccg/database";
import { type Role, type SessionScope } from "@naruto-ccg/shared";

export { hashPassword, verifyPassword, burnPasswordCheck } from "@naruto-ccg/database";
export type { SafeUser };

export interface AuthConfig {
  /** Cookie name. Web and admin MUST differ: cookies are shared across ports on the same host. */
  cookieName: string;
  scope: SessionScope;
  /** If set, only users with this role are ever considered authenticated. */
  requiredRole?: Role;
  loginPath: string;
  /** Session lifetime in seconds. */
  ttlSeconds: (opts: { remember: boolean }) => number;
  /** Whether the cookie persists after browser close (Max-Age) or is a session cookie. */
  persistent: (opts: { remember: boolean }) => boolean;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function createAuth(config: AuthConfig) {
  /** Resolves the user for the current request, or null. Disabled users and wrong roles are never returned. */
  const getCurrentUser = cache(async (): Promise<SafeUser | null> => {
    const token = (await cookies()).get(config.cookieName)?.value;
    if (!token) return null;
    const session = await findActiveSession(hashToken(token), config.scope);
    if (!session) return null;
    const { user } = session;
    if (user.status !== "ACTIVE") return null;
    if (config.requiredRole && user.role !== config.requiredRole) return null;
    return user;
  });

  async function requireUser(): Promise<SafeUser> {
    const user = await getCurrentUser();
    if (!user) redirect(config.loginPath);
    return user;
  }

  /** Creates a DB session and sets the HttpOnly cookie. Call only from Server Actions / Route Handlers. */
  async function createSession(userId: string, opts: { remember?: boolean } = {}): Promise<void> {
    const remember = opts.remember ?? false;
    const token = randomBytes(32).toString("base64url");
    const ttl = config.ttlSeconds({ remember });
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const ua = (await headers()).get("user-agent")?.slice(0, 255) ?? null;
    await createSessionRecord({ userId, tokenHash: hashToken(token), scope: config.scope, expiresAt, userAgent: ua });
    (await cookies()).set(config.cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(config.persistent({ remember }) ? { expires: expiresAt } : {}),
    });
  }

  /** Deletes the server-side session and the cookie. */
  async function deleteSession(): Promise<void> {
    const jar = await cookies();
    const token = jar.get(config.cookieName)?.value;
    if (token) await deleteSessionByHash(hashToken(token));
    jar.delete(config.cookieName);
  }

  async function currentTokenHash(): Promise<string | undefined> {
    const token = (await cookies()).get(config.cookieName)?.value;
    return token ? hashToken(token) : undefined;
  }

  return { getCurrentUser, requireUser, createSession, deleteSession, currentTokenHash };
}

// ---------- minimal in-memory login throttle (per process; use a shared store when scaling out) ----------

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function checkLoginThrottle(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) return true;
  return rec.count < MAX_ATTEMPTS;
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else rec.count += 1;
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}

export async function clientKey(email: string): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${ip}|${email}`;
}
