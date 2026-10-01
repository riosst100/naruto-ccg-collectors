import { createAuth } from "@naruto-ccg/auth";
import { SESSION_TTL } from "@naruto-ccg/shared";

export const { getCurrentUser, requireUser, createSession, deleteSession } = createAuth({
  cookieName: "ccg_session",
  scope: "WEB",
  loginPath: "/login",
  ttlSeconds: ({ remember }) => (remember ? SESSION_TTL.webRememberSeconds : SESSION_TTL.webDefaultSeconds),
  // "Ingat saya" => persistent cookie that survives closing the browser; otherwise a session cookie.
  persistent: ({ remember }) => remember,
});
