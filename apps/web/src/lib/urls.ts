import { storageUrl } from "@naruto-ccg/storage";

/** Public URL of a stored image key (served by app/uploads/[...path]/route.ts). */
export const imageUrl = (key: string | null | undefined) => storageUrl(key, "/uploads");

/** Only allow same-site relative redirects after login. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
}
