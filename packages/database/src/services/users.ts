import { PAGE_SIZE, type Role, type UserStatus } from "@naruto-ccg/shared";
import { isUniqueViolation, makePage, pageArgs, prisma, ServiceError, type Prisma } from "../client";

/** Never select passwordHash for anything that can reach a UI. */
export const safeUserSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

// ---------- auth data access ----------

export async function createUser(data: { username: string; email: string; passwordHash: string; role?: Role }) {
  try {
    return await prisma.user.create({ data, select: safeUserSelect });
  } catch (e) {
    if (isUniqueViolation(e)) throw new ServiceError("Email ini sudah terdaftar.", "email");
    throw e;
  }
}

export async function findUserWithHashByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserWithHashById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createSessionRecord(data: { userId: string; tokenHash: string; scope: string; expiresAt: Date; userAgent?: string | null }) {
  return prisma.session.create({ data });
}

/** Returns the session and its (safe) user only if it exists, is unexpired, and belongs to the scope. */
export async function findActiveSession(tokenHash: string, scope: string) {
  const session = await prisma.session.findUnique({ where: { tokenHash }, include: { user: { select: safeUserSelect } } });
  if (!session || session.scope !== scope) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session;
}

export async function deleteSessionByHash(tokenHash: string) {
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function deleteUserSessions(userId: string, exceptTokenHash?: string) {
  await prisma.session.deleteMany({ where: { userId, ...(exceptTokenHash ? { tokenHash: { not: exceptTokenHash } } : {}) } });
}

export async function purgeExpiredSessions() {
  const res = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return res.count;
}

export async function updatePasswordHash(userId: string, passwordHash: string) {
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

// ---------- admin ----------

export async function getUsers(opts: { q?: string; role?: string; page?: number } = {}) {
  const q = opts.q?.trim();
  const where: Prisma.UserWhereInput = {
    ...(opts.role ? { role: opts.role } : {}),
    ...(q ? { OR: [{ username: { contains: q } }, { email: { contains: q } }] } : {}),
  };
  const { page, skip, take } = pageArgs(opts.page, PAGE_SIZE);
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: { ...safeUserSelect, _count: { select: { collectionItems: true, wishlistItems: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  return makePage(items, total, page, PAGE_SIZE);
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { ...safeUserSelect, _count: { select: { collectionItems: true, wishlistItems: true, sessions: true } } },
  });
}

export async function setUserRole(actorId: string, targetId: string, role: Role) {
  if (actorId === targetId) throw new ServiceError("Anda tidak dapat mengubah peran sendiri.");
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
  if (!target) throw new ServiceError("Pengguna tidak ditemukan.");
  if (target.role === "ADMIN" && role !== "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    if (admins <= 1) throw new ServiceError("Tidak dapat menurunkan admin aktif terakhir.");
  }
  const user = await prisma.user.update({ where: { id: targetId }, data: { role }, select: safeUserSelect });
  // Drop sessions so permission changes take effect at once.
  if (role !== "ADMIN") await prisma.session.deleteMany({ where: { userId: targetId, scope: "ADMIN" } });
  return user;
}

export async function setUserStatus(actorId: string, targetId: string, status: UserStatus) {
  if (actorId === targetId) throw new ServiceError("Anda tidak dapat menonaktifkan akun sendiri.");
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
  if (!target) throw new ServiceError("Pengguna tidak ditemukan.");
  if (status === "DISABLED" && target.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
    if (admins <= 1) throw new ServiceError("Tidak dapat menonaktifkan admin aktif terakhir.");
  }
  const user = await prisma.user.update({ where: { id: targetId }, data: { status }, select: safeUserSelect });
  if (status === "DISABLED") await prisma.session.deleteMany({ where: { userId: targetId } });
  return user;
}

export async function getDashboardStats() {
  const [users, series, cards, wishlistItems, collectionItems] = await Promise.all([
    prisma.user.count(),
    prisma.series.count(),
    prisma.card.count({ where: { archivedAt: null } }),
    prisma.wishlistItem.count(),
    prisma.collectionItem.count(),
  ]);
  return { users, series, cards, wishlistItems, collectionItems };
}
