import { createAuth } from "@naruto-ccg/auth";
import { SESSION_TTL } from "@naruto-ccg/shared";

// Separate cookie name + session scope + required role: a normal user's session can never open the admin site,
// and every call re-reads the user's role from the database (demotion takes effect immediately).
export const {
  getCurrentUser: getCurrentAdmin,
  requireUser: requireAdmin,
  createSession,
  deleteSession,
  currentTokenHash,
} = createAuth({
  cookieName: "ccg_admin_session",
  scope: "ADMIN",
  requiredRole: "ADMIN",
  loginPath: "/login",
  ttlSeconds: () => SESSION_TTL.adminSeconds,
  persistent: () => false,
});
