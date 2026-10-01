import type { Metadata } from "next";
import Link from "next/link";
import { adminListAllSeriesOptions, adminListCards, listRarities } from "@naruto-ccg/database";
import { ImportCardsButton } from "@/components/forms";
import { CARD_TYPES, PUBLISH_STATUSES, STATUS_LABEL } from "@naruto-ccg/shared";
import { EmptyState, Pagination } from "@naruto-ccg/ui";
import { CardsTable } from "@/components/cards-table";
import { PageHeader, one, pageNum } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Kartu" };

export default async function CardsListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = { q: one(sp.q), seriesId: one(sp.seriesId), rarity: one(sp.rarity), cardType: one(sp.cardType), status: one(sp.status) };
  const [data, seriesOptions, rarities] = await Promise.all([adminListCards({ ...filters, page: pageNum(sp.page) }), adminListAllSeriesOptions(), listRarities()]);
  const exportQuery = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();
  const anyFilter = Object.values(filters).some(Boolean);

  const select = (name: string, value: string | undefined, label: string, options: readonly string[] | { id: string; name: string }[]) => (
    <select name={name} defaultValue={value ?? ""} aria-label={label} className="input w-auto">
      <option value="">{label}</option>
      {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{STATUS_LABEL[o] ?? o}</option> : <option key={o.id} value={o.id}>{o.name}</option>))}
    </select>
  );

  return (
    <>
      <PageHeader
        title="Kartu"
        subtitle={`${data.total} ${anyFilter ? "cocok" : "total"}`}
        actions={
          <>
            <ImportCardsButton />
            <Link href={`/cards/export?${exportQuery}`} prefetch={false} className="btn btn-secondary" download>
              Ekspor XLSX
            </Link>
            <Link href={`/cards/export?${exportQuery}&format=csv`} prefetch={false} className="btn btn-secondary" download>
              Ekspor CSV
            </Link>
            <Link href="/cards/create" className="btn btn-primary">
            + Buat kartu
          </Link>
          </>
        }
      />
      <form role="search" className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={filters.q} placeholder="Nama, nomor, atau seri…" className="input max-w-xs" />
        {select("seriesId", filters.seriesId, "Semua seri", seriesOptions)}
        {select("rarity", filters.rarity, "Semua kelangkaan", rarities)}
        {select("cardType", filters.cardType, "Semua tipe", CARD_TYPES)}
        {select("status", filters.status, "Semua status", PUBLISH_STATUSES)}
        <button className="btn btn-primary">Cari</button>
        {anyFilter && (
          <Link href="/cards" className="btn btn-ghost">
            Atur ulang
          </Link>
        )}
      </form>

      {data.items.length === 0 ? (
        <EmptyState title="Tidak ada kartu ditemukan">{anyFilter ? "Coba hapus beberapa filter." : "Buat kartu pertama Anda."}</EmptyState>
      ) : (
        <CardsTable
          key={JSON.stringify([filters, data.page])}
          total={data.total}
          filters={filters}
          rows={data.items.map((c) => ({ id: c.id, imageSrc: imageUrl(c.image), cardNumber: c.cardNumber, name: c.name, seriesName: c.series.name, rarity: c.rarity, cardType: c.cardType, status: c.status }))}
        />
      )}
      <Pagination page={data.page} pageCount={data.pageCount} basePath="/cards" params={filters} />
    </>
  );
}
