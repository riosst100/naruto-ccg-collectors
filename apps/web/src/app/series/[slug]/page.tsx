import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCards, getSeriesBySlug, getUserCardStates } from "@naruto-ccg/database";
import { formatDate } from "@naruto-ccg/shared";
import { EmptyState } from "@naruto-ccg/ui";
import { CardTile } from "@/components/card-tile";
import { getCurrentUser } from "@/lib/auth";
import { imageUrl } from "@/lib/urls";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const series = await getSeriesBySlug((await params).slug);
  return { title: series?.name ?? "Seri tidak ditemukan" };
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const [cards, user] = await Promise.all([getCards({ seriesSlug: slug }), getCurrentUser()]);
  const states = user ? await getUserCardStates(user.id, cards.map((c) => c.id)) : null;

  return (
    <>
      <section className="mb-8 flex flex-col gap-5 sm:flex-row">
        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-[0_12px_40px_-16px_rgb(249_115_22_/_0.5)] sm:w-72 sm:shrink-0">
          {series.image && <img src={imageUrl(series.image)!} alt={series.name} className="h-full w-full object-contain" />}
        </div>
        <div>
          <h1 className="title-glow text-4xl">{series.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {series.cardCount} kartu · Rilis {formatDate(series.releaseDate)}
          </p>
          {series.description && <p className="mt-3 max-w-2xl whitespace-pre-line text-slate-300">{series.description}</p>}
        </div>
      </section>

      {cards.length === 0 ? (
        <EmptyState title="Belum ada kartu di seri ini" />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {cards.map((c) => (
            <CardTile
              key={c.id}
              card={c}
              loggedIn={!!user}
              next={`/series/${slug}`}
              wishlisted={states?.wishlisted.has(c.id) ?? false}
              ownedQty={states?.owned.get(c.id) ?? 0}
            />
          ))}
        </div>
      )}
    </>
  );
}
