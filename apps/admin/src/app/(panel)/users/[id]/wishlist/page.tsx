import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserById, getUserWishlistByAdmin } from "@naruto-ccg/database";
import { formatDate } from "@naruto-ccg/shared";
import { EmptyState, Pagination } from "@naruto-ccg/ui";
import { PageHeader, SearchBar, Table, td, th, Thumb, one, pageNum } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Wishlist pengguna" };

export default async function UserWishlistPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const q = one(sp.q);
  const user = await getUserById(id);
  if (!user) notFound();
  const data = await getUserWishlistByAdmin(id, { q, page: pageNum(sp.page) });

  return (
    <>
      <PageHeader
        title={`Wishlist ${user.username}`}
        subtitle={
          <>
            Hanya baca · {data.total} item ·{" "}
            <Link href={`/users/${id}`} className="underline">
              Kembali ke pengguna
            </Link>
          </>
        }
      />
      <SearchBar placeholder="Nama, nomor, atau seri kartu…" q={q} />
      {data.items.length === 0 ? (
        <EmptyState title={q ? "Tidak ada kartu yang cocok" : "Wishlist ini kosong"} />
      ) : (
        <Table>
          <thead>
            <tr>
              {["", "Kartu", "Seri", "Kelangkaan", "Ditambahkan"].map((h, i) => (
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
                  <span className="font-medium">{w.card.name}</span> <span className="text-slate-500">#{w.card.cardNumber}</span>
                </td>
                <td className={td}>{w.card.series.name}</td>
                <td className={td}>{w.card.rarity}</td>
                <td className={td}>{formatDate(w.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath={`/users/${id}/wishlist`} params={{ q }} />
    </>
  );
}
