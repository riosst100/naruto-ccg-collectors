import type { Metadata } from "next";
import Link from "next/link";
import { adminListSeries } from "@naruto-ccg/database";
import { formatDate } from "@naruto-ccg/shared";
import { ActionButton, EmptyState, Pagination } from "@naruto-ccg/ui";
import { PageHeader, SearchBar, StatusBadge, Table, td, th, Thumb, one, pageNum } from "@/components/ui";
import { deleteSeriesAction, setSeriesStatusAction } from "@/lib/actions/catalog";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Seri" };

export default async function SeriesListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q);
  const data = await adminListSeries({ q, page: pageNum(sp.page) });

  return (
    <>
      <PageHeader
        title="Seri"
        subtitle={`${data.total} total`}
        actions={
          <Link href="/series/create" className="btn btn-primary">
            + Buat seri
          </Link>
        }
      />
      <SearchBar placeholder="Cari berdasarkan nama…" q={q} />
      {data.items.length === 0 ? (
        <EmptyState title={q ? "Tidak ada seri yang cocok" : "Belum ada seri"}>
          <Link href="/series/create" className="underline">
            Buat seri pertama
          </Link>
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              {["Gambar", "Nama", "Slug", "Kartu", "Status", "Tanggal Rilis", "Dibuat", "Aksi"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.map((s) => (
              <tr key={s.id}>
                <td className={td}>
                  <Thumb image={s.image} alt={s.name} wide />
                </td>
                <td className={`${td} font-medium`}>{s.name}</td>
                <td className={`${td} font-mono text-xs text-slate-500`}>{s.slug}</td>
                <td className={td}>{s.cardCount}</td>
                <td className={td}>
                  <StatusBadge status={s.status} />
                </td>
                <td className={td}>{formatDate(s.releaseDate)}</td>
                <td className={td}>{formatDate(s.createdAt)}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    <Link href={`/series/${s.id}/edit`} className="btn btn-secondary">
                      Ubah
                    </Link>
                    <Link href={`/cards?seriesId=${s.id}`} className="btn btn-secondary">
                      Lihat kartu
                    </Link>
                    <ActionButton
                      action={setSeriesStatusAction}
                      fields={{ id: s.id, status: s.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }}
                      className="btn-secondary"
                    >
                      {s.status === "PUBLISHED" ? "Batalkan publikasi" : "Publikasikan"}
                    </ActionButton>
                    <ActionButton
                      action={deleteSeriesAction}
                      fields={{ id: s.id }}
                      className="btn-danger"
                      confirm={{ title: `Hapus “${s.name}”?`, message: `Tindakan ini tidak dapat dibatalkan. ${s.cardCount} kartu di seri ini akan ikut dihapus permanen${s.collectionItemCount > 0 ? `, termasuk ${s.collectionItemCount} item koleksi milik pengguna beserta foto-fotonya` : ""}, dan kartu tersebut juga dihapus dari wishlist pengguna.`, confirmLabel: "Hapus seri dan semua kartunya" }}
                    >
                      Hapus
                    </ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath="/series" params={{ q }} />
    </>
  );
}
