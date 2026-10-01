import { existsSync } from "node:fs";
import path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";

function findRepoRoot(start = process.cwd()): string {
  let dir = start;
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return start;
    dir = parent;
  }
}

/** Relative sqlite URLs resolve from the repo root so every app/script hits the same file. */
export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./data/dev.db";
  if (url.startsWith("file:") && !path.isAbsolute(url.slice(5))) {
    return `file:${path.resolve(findRepoRoot(), url.slice(5))}`;
  }
  return url;
}

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.__prisma ?? new PrismaClient({ datasourceUrl: resolveDatabaseUrl() });
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;

export { Prisma };

/** Expected, user-presentable failure from business logic (as opposed to a bug). */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function pageArgs(page: number | undefined, pageSize: number) {
  const p = Number.isFinite(page) && page! > 0 ? Math.floor(page!) : 1;
  return { page: p, skip: (p - 1) * pageSize, take: pageSize };
}

export function makePage<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
