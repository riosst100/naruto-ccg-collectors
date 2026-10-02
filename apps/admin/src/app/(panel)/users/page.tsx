import type { Metadata } from "next";
import Link from "next/link";
import { getUsers } from "@naruto-ccg/database";
import { ROLES, formatDate } from "@naruto-ccg/shared";
import { EmptyState, Pagination } from "@naruto-ccg/ui";
import { PageHeader, StatusBadge, Table, td, th, one, pageNum } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Pengguna" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const role = ROLES.find((r) => r === one(sp.role));
  const data = await getUsers({ q, role, page: pageNum(sp.page) });

  return (
    <>
      <PageHeader title="Pengguna" subtitle={`${data.total} ${q || role ? "cocok" : "total"}`} />
      <form role="search" className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Nama lengkap atau email…" className="input max-w-xs" />
        <select name="role" defaultValue={role ?? ""} aria-label="Peran" className="input w-auto">
          <option value="">Semua peran</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button className="btn btn-primary">Cari</button>
        {(q || role) && (
          <Link href="/users" className="btn btn-ghost">
            Atur ulang
          </Link>
        )}
      </form>

      {data.items.length === 0 ? (
        <EmptyState title="Tidak ada pengguna ditemukan" />
      ) : (
        <Table>
          <thead>
            <tr>
              {["Pengguna", "Email", "Peran", "Koleksi", "Wishlist", "Dibuat", "Status", "Aksi"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((u) => (
              <tr key={u.id}>
                <td className={`${td} font-medium`}>{u.username}</td>
                <td className={td}>{u.email}</td>
                <td className={td}>
                  <StatusBadge status={u.role} />
                </td>
                <td className={td}>{u._count.collectionItems}</td>
                <td className={td}>{u._count.wishlistItems}</td>
                <td className={td}>{formatDate(u.createdAt)}</td>
                <td className={td}>
                  <StatusBadge status={u.status} />
                </td>
                <td className={td}>
                  <div className="flex gap-1.5">
                    <Link href={`/users/${u.id}`} className="btn btn-secondary">
                      Lihat
                    </Link>
                    <Link href={`/users/${u.id}/collection`} className="btn btn-secondary">
                      Koleksi
                    </Link>
                    <Link href={`/users/${u.id}/wishlist`} className="btn btn-secondary">
                      Wishlist
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath="/users" params={{ q, role }} />
    </>
  );
}
