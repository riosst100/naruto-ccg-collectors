import Link from "next/link";
import { getSeries } from "@naruto-ccg/database";
import { formatDate } from "@naruto-ccg/shared";
import { EmptyState } from "@naruto-ccg/ui";
import { imageUrl } from "@/lib/urls";

export default async function HomePage() {
  const series = await getSeries();
  return (
    <>
      <section className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-600/20 via-white/[0.03] to-fuchsia-600/20 px-6 py-10 sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-400">Koleksi kartu</p>
        <h1 className="title-glow mt-2 text-5xl sm:text-6xl">Naruto CCG</h1>
        <p className="mt-3 max-w-xl text-slate-300">Pilih seri untuk menjelajahi kartunya, menyusun wishlist, dan mengelola koleksi Anda.</p>
      </section>
      {series.length === 0 ? (
        <EmptyState title="Belum ada seri yang dipublikasikan">Silakan kembali lagi nanti.</EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Link key={s.id} href={`/series/${s.slug}`} className="glass surface-hover group overflow-hidden rounded-2xl">
              <div className="aspect-video bg-gradient-to-br from-white/10 to-white/[0.02]">
                {s.image && <img src={imageUrl(s.image)!} alt={s.name} className="h-full w-full object-contain" />}
              </div>
              <div className="p-4">
                <h2 className="font-semibold group-hover:text-brand-400">{s.name}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {s.cardCount} kartu · Rilis {formatDate(s.releaseDate)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
