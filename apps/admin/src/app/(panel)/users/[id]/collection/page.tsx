import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserById, getUserCollectionByAdmin } from "@naruto-ccg/database";
import { formatDate, formatMoney } from "@naruto-ccg/shared";
import { EmptyState, Pagination } from "@naruto-ccg/ui";
import { PageHeader, SearchBar, Table, td, th, Thumb, one, pageNum } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Koleksi pengguna" };

export default async function UserCollectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const q = one(sp.q);
  const user = await getUserById(id);
  if (!user) notFound();
  const data = await getUserCollectionByAdmin(id, { q, page: pageNum(sp.page) });

  return (
    <>
      <PageHeader
        title={`Koleksi ${user.username}`}
        subtitle={
          <>
            Hanya baca · {data.summary.uniqueCards} unik, {data.summary.totalCards} total ·{" "}
            <Link href={`/users/${id}`} className="underline">
              Kembali ke pengguna
            </Link>
          </>
        }
      />
      <SearchBar placeholder="Nama, nomor, atau seri kartu…" q={q} />
      {data.items.length === 0 ? (
        <EmptyState title={q ? "Tidak ada kartu yang cocok" : "Koleksi ini kosong"} />
      ) : (
        <Table>
          <thead>
            <tr>
              {["", "Kartu", "Seri", "Jml", "Harga Beli", "Harga Jual", "Catatan", "Gambar", "Ditambahkan"].map((h, i) => (
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
                  <span className="font-medium">{i.card.name}</span> <span className="text-slate-500">#{i.card.cardNumber}</span>
                </td>
                <td className={td}>{i.card.series.name}</td>
                <td className={td}>{i.quantity}</td>
                <td className={td}>{i.buyPrice == null ? "—" : formatMoney(i.buyPrice)}</td>
                <td className={td}>{i.sellPrice == null ? "—" : formatMoney(i.sellPrice)}</td>
                <td className={`${td} max-w-48 truncate`} title={i.notes ?? ""}>
                  {i.notes ?? "—"}
                </td>
                <td className={td}>
                  <div className="flex gap-1">
                    {i.images.length === 0 && "—"}
                    {i.images.map((img) => (
                      <a key={img.id} href={imageUrl(img.imageUrl)!} target="_blank" rel="noreferrer">
                        <img src={imageUrl(img.imageUrl)!} alt={`Kartu ${i.card.name} milik ${user.username}`} className="h-12 w-9 rounded border border-slate-200 object-cover" />
                      </a>
                    ))}
                  </div>
                </td>
                <td className={td}>{formatDate(i.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath={`/users/${id}/collection`} params={{ q }} />
    </>
  );
}
