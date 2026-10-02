import type { Metadata } from "next";
import Link from "next/link";
import { adminListWishlists } from "@naruto-ccg/database";
import { formatDate } from "@naruto-ccg/shared";
import { EmptyState, Pagination } from "@naruto-ccg/ui";
import { PageHeader, SearchBar, Table, td, th, Thumb, one, pageNum } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const data = await adminListWishlists({ q, page: pageNum(sp.page) });
  return (
    <>
      <PageHeader title="Wishlist" subtitle={`${data.total} item wishlist dari semua pengguna · hanya baca`} />
      <SearchBar placeholder="Nama lengkap, email, nama atau nomor kartu…" q={q} />
      {data.items.length === 0 ? (
        <EmptyState title="Tidak ada item wishlist ditemukan" />
      ) : (
        <Table>
          <thead>
            <tr>
              {["", "Pengguna", "Kartu", "Seri", "Kelangkaan", "Ditambahkan"].map((h, i) => (
                <th key={i} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((w) => (
              <tr key={w.id}>
                <td className={td}>
                  <Thumb image={w.card.image} alt={w.card.name} />
                </td>
                <td className={td}>
                  <Link href={`/users/${w.user.id}/wishlist`} className="font-medium text-brand-700 hover:underline">
                    {w.user.username}
                  </Link>
                </td>
                <td className={td}>
                  {w.card.name} <span className="text-slate-500">#{w.card.cardNumber}</span>
                </td>
                <td className={td}>{w.card.series.name}</td>
                <td className={td}>{w.card.rarity}</td>
                <td className={td}>{formatDate(w.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath="/wishlists" params={{ q }} />
    </>
  );
}
