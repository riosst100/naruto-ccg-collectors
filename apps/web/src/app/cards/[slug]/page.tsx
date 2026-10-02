import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardBySlug, getUserCardStates } from "@naruto-ccg/database";
import { CardActions } from "@/components/forms";
import { CardImage, RarityBadge } from "@/components/card-tile";
import { getCurrentUser } from "@/lib/auth";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const card = await getCardBySlug((await params).slug);
  return { title: card ? `${card.name} (#${card.cardNumber})` : "Kartu tidak ditemukan" };
}

export default async function CardPage({ params }: Props) {
  const { slug } = await params;
  const card = await getCardBySlug(slug);
  if (!card) notFound();

  const user = await getCurrentUser();
  const states = user ? await getUserCardStates(user.id, [card.id]) : null;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,360px)_1fr]">
      <div className="mx-auto w-full max-w-[360px] md:mx-0"><CardImage image={card.image} name={card.name} rarity={card.rarity} /></div>
      <div>
        <p className="text-sm text-slate-400">
          <Link href={`/series/${card.series.slug}`} className="hover:underline">
            {card.series.name}
          </Link>
        </p>
        <h1 className="mt-1 title-glow text-4xl">{card.name}</h1>
        <dl className="mt-4 grid max-w-md grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-slate-400">Nomor kartu</dt>
          <dd>#{card.cardNumber}</dd>
          <dt className="text-slate-400">Seri</dt>
          <dd>{card.series.name}</dd>
          <dt className="text-slate-400">Kelangkaan</dt>
          <dd>
            <RarityBadge rarity={card.rarity} />
          </dd>
          <dt className="text-slate-400">Tipe kartu</dt>
          <dd>{card.cardType}</dd>
        </dl>

        {card.description && <p className="mt-5 max-w-2xl whitespace-pre-line text-slate-300">{card.description}</p>}

        {card.attributes.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-lg font-semibold">Atribut</h2>
            <dl className="divide-y divide-white/10 overflow-hidden glass rounded-2xl text-sm">
              {card.attributes.map((a) => (
                <div key={a.id} className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-2">
                  <dt className="font-medium text-slate-400">{a.name}</dt>
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
