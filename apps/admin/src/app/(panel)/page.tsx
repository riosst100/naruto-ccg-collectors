import { getDashboardStats } from "@naruto-ccg/database";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export default async function DashboardPage() {
  await requireAdmin();
  const stats = await getDashboardStats();
  const rows = [
    ["Pengguna", stats.users],
    ["Seri", stats.series],
    ["Kartu", stats.cards],
    ["Item Wishlist", stats.wishlistItems],
    ["Item Koleksi", stats.collectionItems],
  ] as const;
  return (
    <>
      <PageHeader title="Dasbor" subtitle="Ringkasan platform Naruto CCG." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value.toLocaleString("en-US")}</p>
          </div>
        ))}
      </div>
    </>
  );
}
