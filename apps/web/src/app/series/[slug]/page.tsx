import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCards, getSeriesBySlug, getUserCardStates } from "@naruto-ccg/database";
import { RARITIES, formatDate } from "@naruto-ccg/shared";
import { EmptyState } from "@naruto-ccg/ui";
import { CardTile } from "@/components/card-tile";
import { getCurrentUser } from "@/lib/auth";
import { rarityLabel } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { imageUrl } from "@/lib/urls";

type Props = { params: Promise<{ slug: string }> };

/** Highest rarity first, like the Kayou card lists; rarities outside RARITIES go last. */
const rarityRank = (r: string) => (RARITIES as readonly string[]).indexOf(r);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [series, t] = await Promise.all([getSeriesBySlug((await params).slug), getDictionary()]);
  return { title: series?.name ?? t.series.notFound };
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const [cards, user, t] = await Promise.all([getCards({ seriesSlug: slug }), getCurrentUser(), getDictionary()]);
  const states = user ? await getUserCardStates(user.id, cards.map((c) => c.id)) : null;

  const groups = new Map<string, typeof cards>();
  for (const c of cards) groups.set(c.rarity, [...(groups.get(c.rarity) ?? []), c]);
  const sections = [...groups.entries()].sort(([a], [b]) => rarityRank(b) - rarityRank(a));

  return (
    <>
      <section className="mb-14 grid items-center gap-8 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-12">
        <div className="aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-[0_24px_50px_-24px_rgb(244_209_0_/_0.6)]">
          {series.image && <img src={imageUrl(series.image)!} alt={series.name} className="h-full w-full object-contain" />}
        </div>
        <div>
          <p className="eyebrow">{t.series.released(formatDate(series.releaseDate, t.intl))}</p>
          <h1 className="page-title mt-3 text-4xl lg:text-5xl">{series.name}</h1>
          <p className="mt-4 text-sm font-semibold text-muted">
            {t.series.cardTotal(series.cardCount)} · {t.series.rarityTiers(sections.length)}
          </p>
          {series.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{series.description}</p>}
          {sections.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {sections.map(([rarity, list], i) => (
                <a
                  key={rarity}
                  href={`#rarity-${i + 1}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-soft px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand-500 hover:bg-brand-500"
                >
                  {rarityLabel(t, rarity)}
                  <span className="text-faint">{list.length}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {cards.length === 0 ? (
        <EmptyState title={t.series.empty} />
      ) : (
        <div className="space-y-14">
          {sections.map(([rarity, list], i) => (
            <section key={rarity} id={`rarity-${i + 1}`} className="scroll-mt-24">
              <div className="section-title">
                <h2 className="page-title text-3xl">
                  {rarityLabel(t, rarity)}
                  <span className="ml-3 align-middle font-sans text-sm font-semibold normal-case tracking-normal text-faint">{list.length}</span>
                </h2>
                <span className="page-title text-3xl !text-brand-500">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {list.map((c) => (
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
            </section>
          ))}
        </div>
      )}
    </>
  );
}
