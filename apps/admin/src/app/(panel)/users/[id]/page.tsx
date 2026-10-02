import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserById, getUserCollectionByAdmin, getUserWishlistByAdmin } from "@naruto-ccg/database";
import { formatDate, formatMoney } from "@naruto-ccg/shared";
import { ActionButton } from "@naruto-ccg/ui";
import { PageHeader, StatusBadge, Table, td, th, Thumb } from "@/components/ui";
import { setRoleAction, setStatusAction } from "@/lib/actions/users";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Pengguna" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const user = await getUserById(id);
  if (!user) notFound();
  const [collection, wishlist] = await Promise.all([getUserCollectionByAdmin(id, { page: 1 }), getUserWishlistByAdmin(id, { page: 1 })]);
  const isSelf = admin.id === user.id;

  return (
    <>
      <PageHeader title={user.username} subtitle={user.email} />

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Informasi pengguna</h2>
        <dl className="grid max-w-xl grid-cols-[9rem_1fr] gap-y-2 text-sm">
          <dt className="text-slate-500">Nama lengkap</dt>
          <dd>{user.username}</dd>
          <dt className="text-slate-500">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-slate-500">Peran</dt>
          <dd>
            <StatusBadge status={user.role} />
          </dd>
          <dt className="text-slate-500">Status</dt>
          <dd>
            <StatusBadge status={user.status} />
          </dd>
          <dt className="text-slate-500">Dibuat</dt>
          <dd>{formatDate(user.createdAt)}</dd>
          <dt className="text-slate-500">Sesi aktif</dt>
          <dd>{user._count.sessions}</dd>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <ActionButton
            action={setRoleAction}
            fields={{ userId: user.id, role: user.role === "ADMIN" ? "USER" : "ADMIN" }}
            className="btn-secondary"
            disabled={isSelf}
            title={isSelf ? "Anda tidak dapat mengubah peran sendiri" : undefined}
            confirm={{ title: user.role === "ADMIN" ? "Cabut akses admin?" : "Berikan akses admin?", message: user.role === "ADMIN" ? `${user.username} tidak akan bisa lagi menggunakan situs admin.` : `${user.username} akan memiliki akses penuh ke situs admin.`, confirmLabel: "Ubah peran" }}
          >
            {user.role === "ADMIN" ? "Turunkan ke USER" : "Jadikan ADMIN"}
          </ActionButton>
          <ActionButton
            action={setStatusAction}
            fields={{ userId: user.id, status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }}
            className={user.status === "ACTIVE" ? "btn-danger" : "btn-secondary"}
            disabled={isSelf}
            title={isSelf ? "Anda tidak dapat menonaktifkan akun sendiri" : undefined}
            confirm={user.status === "ACTIVE" ? { title: "Nonaktifkan pengguna ini?", message: "Pengguna akan dikeluarkan dari semua perangkat dan tidak dapat masuk.", confirmLabel: "Nonaktifkan" } : undefined}
          >
            {user.status === "ACTIVE" ? "Nonaktifkan pengguna" : "Aktifkan pengguna"}
          </ActionButton>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">
            Koleksi ({collection.total}) <span className="text-sm font-normal text-slate-500">· total {collection.summary.totalCards} kartu</span>
          </h2>
          <Link href={`/users/${user.id}/collection`} className="text-sm font-medium text-brand-700 underline">
            Lihat semua
          </Link>
        </div>
        {collection.summary.totalCards > 0 && (
          <p className="mb-2 text-sm text-slate-600">
            Total beli {formatMoney(collection.summary.totalBuy)} · Total jual {formatMoney(collection.summary.totalSell)}
          </p>
        )}
        {collection.items.length === 0 ? (
          <p className="text-sm text-slate-500">Tidak ada apa pun di koleksi ini.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                {["Kartu", "Seri", "Jml"].map((h) => (
                  <th key={h} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {collection.items.slice(0, 5).map((i) => (
                <tr key={i.id}>
                  <td className={td}>
                    #{i.card.cardNumber} {i.card.name}
                  </td>
                  <td className={td}>{i.card.series.name}</td>
                  <td className={td}>{i.quantity}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Wishlist ({wishlist.total})</h2>
          <Link href={`/users/${user.id}/wishlist`} className="text-sm font-medium text-brand-700 underline">
            Lihat semua
          </Link>
        </div>
        {wishlist.items.length === 0 ? (
          <p className="text-sm text-slate-500">Tidak ada apa pun di wishlist ini.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                {["", "Kartu", "Seri", "Kelangkaan"].map((h, i) => (
                  <th key={i} className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {wishlist.items.slice(0, 5).map((w) => (
                <tr key={w.id}>
                  <td className={td}>
                    <Thumb image={w.card.image} alt={w.card.name} />
                  </td>
                  <td className={td}>
                    #{w.card.cardNumber} {w.card.name}
                  </td>
                  <td className={td}>{w.card.series.name}</td>
                  <td className={td}>{w.card.rarity}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>
    </>
  );
}
