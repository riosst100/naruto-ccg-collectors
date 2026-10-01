"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ActionButton } from "@naruto-ccg/ui";
import { bulkCardsAction, deleteCardAction, setCardStatusAction } from "@/lib/actions/catalog";
import { StatusBadge, Table, td, th } from "./table";

export interface CardRow {
  id: string;
  imageSrc: string | null;
  cardNumber: string;
  name: string;
  seriesName: string;
  rarity: string;
  cardType: string;
  status: string;
}

export function CardsTable({ rows, total, filters }: { rows: CardRow[]; total: number; filters: Record<string, string | undefined> }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const headRef = useRef<HTMLInputElement>(null);

  const pageIds = rows.map((r) => r.id);
  const pageSelected = pageIds.filter((id) => selected.has(id)).length;
  const allOnPage = rows.length > 0 && pageSelected === rows.length;
  const count = allMatching ? total : selected.size;

  useEffect(() => {
    if (headRef.current) headRef.current.indeterminate = pageSelected > 0 && !allOnPage;
  }, [pageSelected, allOnPage]);

  const clear = () => {
    setSelected(new Set());
    setAllMatching(false);
  };
  const toggle = (id: string) => {
    setAllMatching(false);
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setAllMatching(false);
    setSelected(allOnPage ? new Set() : new Set(pageIds));
  };

  // Payload for the bulk action: explicit ids, or "everything matching the current filters".
  const target: Record<string, string> = allMatching
    ? { mode: "filter", ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v) as [string, string][]) }
    : { mode: "ids", ids: [...selected].join(",") };

  return (
    <>
      {count > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm" role="region" aria-label="Aksi massal">
          <span className="font-medium">{count} kartu dipilih</span>
          {allOnPage && !allMatching && total > rows.length && (
            <button type="button" className="text-brand-700 underline" onClick={() => setAllMatching(true)}>
              Pilih semua {total} kartu yang cocok
            </button>
          )}
          {allMatching && <span className="text-slate-600">(semua kartu yang cocok dengan filter, di semua halaman)</span>}
          <span className="ml-auto flex flex-wrap gap-2">
            <ActionButton action={bulkCardsAction} fields={{ ...target, op: "publish" }} className="btn-secondary" onSuccess={clear}>
              Publikasikan
            </ActionButton>
            <ActionButton action={bulkCardsAction} fields={{ ...target, op: "unpublish" }} className="btn-secondary" onSuccess={clear}>
              Batalkan publikasi
            </ActionButton>
            <ActionButton
              action={bulkCardsAction}
              fields={{ ...target, op: "delete" }}
              className="btn-danger"
              onSuccess={clear}
              confirm={{
                title: `Hapus ${count} kartu?`,
                message: `${allMatching ? "Seluruh kartu yang cocok dengan filter" : `${count} kartu terpilih`} akan dihapus. Kartu yang dimiliki pengguna diarsipkan (disembunyikan dari katalog tetapi tetap ada di koleksi mereka); kartu lainnya dihapus permanen beserta atribut dan entri wishlist-nya. Tindakan ini tidak dapat dibatalkan.`,
                confirmLabel: `Hapus ${count} kartu`,
              }}
            >
              Hapus
            </ActionButton>
            <button type="button" className="btn btn-ghost" onClick={clear}>
              Batal pilih
            </button>
          </span>
        </div>
      )}

      <Table>
        <thead>
          <tr>
            <th className={`${th} w-10`}>
              <input ref={headRef} type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Pilih semua kartu di halaman ini" />
            </th>
            {["Gambar", "Nomor Kartu", "Nama", "Seri", "Kelangkaan", "Tipe", "Status", "Aksi"].map((h) => (
              <th key={h} className={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className={selected.has(c.id) || allMatching ? "bg-indigo-50/60" : undefined}>
              <td className={td}>
                <input type="checkbox" checked={allMatching || selected.has(c.id)} disabled={allMatching} onChange={() => toggle(c.id)} aria-label={`Pilih ${c.name}`} />
              </td>
              <td className={td}>
                {c.imageSrc ? <img src={c.imageSrc} alt={c.name} className="h-14 w-10 rounded border border-slate-200 object-cover" /> : <div className="h-14 w-10 rounded bg-slate-100" />}
              </td>
              <td className={`${td} font-mono`}>#{c.cardNumber}</td>
              <td className={`${td} font-medium`}>{c.name}</td>
              <td className={td}>{c.seriesName}</td>
              <td className={td}>{c.rarity}</td>
              <td className={td}>{c.cardType}</td>
              <td className={td}>
                <StatusBadge status={c.status} />
              </td>
              <td className={td}>
                <div className="flex flex-wrap gap-1.5">
                  <Link href={`/cards/${c.id}/edit`} className="btn btn-secondary">
                    Ubah
                  </Link>
                  <ActionButton action={setCardStatusAction} fields={{ id: c.id, status: c.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }} className="btn-secondary">
                    {c.status === "PUBLISHED" ? "Batalkan publikasi" : "Publikasikan"}
                  </ActionButton>
                  <ActionButton
                    action={deleteCardAction}
                    fields={{ id: c.id }}
                    className="btn-danger"
                    confirm={{
                      title: `Hapus “${c.name}”?`,
                      message: "Jika ada pengguna yang memiliki kartu ini, kartu akan diarsipkan (disembunyikan dari katalog tetapi tetap ada di koleksi mereka). Jika tidak, kartu dihapus permanen.",
                      confirmLabel: "Hapus",
                    }}
                  >
                    Hapus
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
