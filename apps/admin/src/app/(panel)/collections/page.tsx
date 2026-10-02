import type { Metadata } from "next";
import Link from "next/link";
import { adminListCollections } from "@naruto-ccg/database";
import { formatDate, formatMoney } from "@naruto-ccg/shared";
import { EmptyState, Pagination } from "@naruto-ccg/ui";
import { PageHeader, SearchBar, Table, td, th, Thumb, one, pageNum } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Koleksi" };

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const data = await adminListCollections({ q, page: pageNum(sp.page) });
  return (
    <>
      <PageHeader title="Koleksi" subtitle={`${data.total} item koleksi dari semua pengguna · hanya baca`} />
      <SearchBar placeholder="Nama lengkap, email, nama atau nomor kartu…" q={q} />
      {data.items.length === 0 ? (
        <EmptyState title="Tidak ada item koleksi ditemukan" />
      ) : (
        <Table>
          <thead>
            <tr>
              {["", "Pengguna", "Kartu", "Seri", "Jml", "Beli", "Jual", "Ditambahkan"].map((h, i) => (
                <th key={i} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.id}>
                <td className={td}>
                  <Thumb image={i.card.image} alt={i.card.name} />
                </td>
                <td className={td}>
                  <Link href={`/users/${i.user.id}/collection`} className="font-medium text-brand-700 hover:underline">
                    {i.user.username}
                  </Link>
                </td>
                <td className={td}>
                  {i.card.name} <span className="text-slate-500">#{i.card.cardNumber}</span>
                </td>
                <td className={td}>{i.card.series.name}</td>
                <td className={td}>{i.quantity}</td>
                <td className={td}>{i.buyPrice == null ? "—" : formatMoney(i.buyPrice)}</td>
                <td className={td}>{i.sellPrice == null ? "—" : formatMoney(i.sellPrice)}</td>
                <td className={td}>{formatDate(i.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath="/collections" params={{ q }} />
    </>
  );
}
