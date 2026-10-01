import type { Metadata } from "next";
import Link from "next/link";
import { listRaritiesRanked } from "@naruto-ccg/database";
import { ActionButton, EmptyState } from "@naruto-ccg/ui";
import { AddRarityForm, RenameRarityButton } from "@/components/rarity-controls";
import { PageHeader, Table, td, th } from "@/components/ui";
import { deleteRarityAction, moveRarityAction } from "@/lib/actions/rarities";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Kelangkaan" };

export default async function RaritiesPage() {
  await requireAdmin();
  const rarities = await listRaritiesRanked();
  return (
    <>
      <PageHeader title="Kelangkaan" subtitle="Urutan dari tertinggi (atas) ke terendah (bawah). Dipakai untuk mengelompokkan dan mengurutkan koleksi pengguna." />
      <AddRarityForm />
      {rarities.length === 0 ? (
        <EmptyState title="Belum ada kelangkaan">Kelangkaan baru otomatis ditambahkan saat kartu dibuat atau diimpor.</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              {["Peringkat", "Kelangkaan", "Kartu", "Urutan", "Aksi"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rarities.map((r, i) => (
              <tr key={r.id}>
                <td className={`${td} font-mono`}>#{r.rank}</td>
                <td className={`${td} font-medium`}>{r.name}</td>
                <td className={td}>
                  <Link href={`/cards?rarity=${encodeURIComponent(r.name)}`} className="text-brand-700 hover:underline">
                    {r.cardCount}
                  </Link>
                </td>
                <td className={td}>
                  <div className="flex gap-1">
                    <ActionButton action={moveRarityAction} fields={{ id: r.id, dir: "up" }} className="btn-secondary !px-2.5" title={`Naikkan ${r.name}`} disabled={i === 0}>
                      ↑
                    </ActionButton>
                    <ActionButton action={moveRarityAction} fields={{ id: r.id, dir: "down" }} className="btn-secondary !px-2.5" title={`Turunkan ${r.name}`} disabled={i === rarities.length - 1}>
                      ↓
                    </ActionButton>
                  </div>
                </td>
                <td className={td}>
                  <div className="flex gap-1.5">
                    <RenameRarityButton id={r.id} name={r.name} />
                    <ActionButton
                      action={deleteRarityAction}
                      fields={{ id: r.id }}
                      className="btn-danger"
                      confirm={{
                        title: `Hapus “${r.name}”?`,
                        message: r.cardCount > 0 ? `Kelangkaan ini dipakai ${r.cardCount} kartu sehingga tidak dapat dihapus.` : "Kelangkaan ini tidak dipakai kartu mana pun dan akan dihapus.",
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
      )}
    </>
  );
}
