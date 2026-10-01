import Link from "next/link";
import { getSeries } from "@naruto-ccg/database";
import { formatDate } from "@naruto-ccg/shared";
import { EmptyState } from "@naruto-ccg/ui";
import { imageUrl } from "@/lib/urls";

export default async function HomePage() {
  const series = await getSeries();
  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Naruto CCG</h1>
        <p className="mt-1 text-slate-600">Pilih seri untuk menjelajahi kartunya, menyusun wishlist, dan mengelola koleksi Anda.</p>
      </section>
      {series.length === 0 ? (
        <EmptyState title="Belum ada seri yang dipublikasikan">Silakan kembali lagi nanti.</EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Link key={s.id} href={`/series/${s.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="aspect-video bg-slate-200">
                {s.image && <img src={imageUrl(s.image)!} alt={s.name} className="h-full w-full object-contain" />}
              </div>
              <div className="p-4">
                <h2 className="font-semibold group-hover:text-brand-700">{s.name}</h2>
                <p className="mt-1 text-sm text-slate-600">
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
