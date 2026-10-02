import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardBySlug, getUserCardStates } from "@naruto-ccg/database";
import { CardActions } from "@/components/forms";
import { CardImage, RarityBadge } from "@/components/card-tile";
import { getCurrentUser } from "@/lib/auth";
import { cardTypeLabel } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [card, t] = await Promise.all([getCardBySlug((await params).slug), getDictionary()]);
  return { title: card ? `${card.name} (#${card.cardNumber})` : t.card.notFound };
}

export default async function CardPage({ params }: Props) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) notFound();

  const [user, t] = await Promise.all([getCurrentUser(), getDictionary()]);
  const states = user ? await getUserCardStates(user.id, [card.id]) : null;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
      <div className="mx-auto w-full max-w-[360px] md:mx-0"><CardImage image={card.image} name={card.name} rarity={card.rarity} /></div>
      <div>
        <p className="eyebrow mb-2">
          <Link href={`/series/${card.series.slug}`} className="hover:underline">
            {card.series.name}
          </Link>
        </p>
        <h1 className="page-title text-4xl">{card.name}</h1>
        <dl className="mt-6 grid max-w-md grid-cols-[8rem_1fr] items-center gap-y-3 text-sm">
          <dt className="text-xs font-semibold uppercase tracking-wider text-faint">{t.card.number}</dt>
          <dd>#{card.cardNumber}</dd>
          <dt className="text-xs font-semibold uppercase tracking-wider text-faint">{t.card.series}</dt>
          <dd>{card.series.name}</dd>
          <dt className="text-xs font-semibold uppercase tracking-wider text-faint">{t.card.rarity}</dt>
          <dd>
            <RarityBadge rarity={card.rarity} />
          </dd>
          <dt className="text-xs font-semibold uppercase tracking-wider text-faint">{t.card.type}</dt>
          <dd>{cardTypeLabel(t, card.cardType)}</dd>
        </dl>

        {card.description && <p className="mt-5 max-w-2xl whitespace-pre-line text-muted">{card.description}</p>}

        {card.attributes.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 border-b-[3px] border-brand-500 pb-2 page-title text-2xl">{t.card.attributes}</h2>
            <dl className="divide-y divide-line overflow-hidden glass !shadow-none text-sm">
              {card.attributes.map((a) => (
                <div key={a.id} className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-2">
                  <dt className="font-medium text-muted">{a.name}</dt>
                  <dd className="whitespace-pre-line">{a.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="mt-6 max-w-sm">
          <CardActions
            cardId={card.id}
            cardName={card.name}
            loggedIn={!!user}
            next={`/cards/${slug}`}
            wishlisted={states?.wishlisted.has(card.id) ?? false}
            ownedQty={states?.owned.get(card.id) ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
