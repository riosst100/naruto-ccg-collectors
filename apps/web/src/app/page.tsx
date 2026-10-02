import Link from "next/link";
import { getSeries } from "@naruto-ccg/database";
import { formatDate } from "@naruto-ccg/shared";
import { EmptyState } from "@naruto-ccg/ui";
import { getDictionary } from "@/lib/i18n/server";
import { imageUrl } from "@/lib/urls";

export default async function HomePage() {
  const [series, t] = await Promise.all([getSeries(), getDictionary()]);
  return (
    <>
      <section className="relative mb-12 overflow-hidden rounded-3xl bg-black px-6 py-12 text-white sm:px-12 sm:py-14">
        <div aria-hidden className="kayou-glow pointer-events-none absolute -right-40 -top-56 aspect-square w-[36rem]" />
        <p className="eyebrow relative !text-brand-500">{t.home.eyebrow}</p>
        <h1 className="page-title relative mt-3 text-5xl !text-white sm:text-6xl">Naruto CCG</h1>
        <p className="relative mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">{t.home.intro}</p>
      </section>
      {series.length === 0 ? (
        <EmptyState title={t.home.emptyTitle}>{t.home.emptyBody}</EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Link key={s.id} href={`/series/${s.slug}`} className="surface-hover group overflow-hidden rounded-2xl border border-line bg-white">
              <div className="aspect-video bg-black">
                {s.image && <img src={imageUrl(s.image)!} alt={s.name} className="h-full w-full object-contain" />}
              </div>
              <div className="border-t-[3px] border-brand-500 p-4">
                <h2 className="font-semibold leading-snug text-ink group-hover:text-brand-700">{s.name}</h2>
                <p className="mt-1 text-sm text-muted">{t.series.meta(s.cardCount, formatDate(s.releaseDate, t.intl))}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
