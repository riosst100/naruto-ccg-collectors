import type { Metadata } from "next";
import Link from "next/link";
import { getUserCardStates, getUserWishlist } from "@naruto-ccg/database";
import { EmptyState } from "@naruto-ccg/ui";
import { CardImage, RarityBadge } from "@/components/card-tile";
import { CardActions } from "@/components/forms";
import { LoginPrompt } from "@/components/login-prompt";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).wishlist.title };
}

export default async function WishlistPage() {
  const [user, t] = await Promise.all([getCurrentUser(), getDictionary()]);
  if (!user) return <LoginPrompt title={t.wishlist.title} next="/wishlist" />;
  const items = await getUserWishlist(user.id);
  const states = await getUserCardStates(user.id, items.map((i) => i.cardId));

  return (
    <>
      <h1 className="mb-1 page-title text-4xl">{t.wishlist.title}</h1>
      <p className="mb-6 text-muted">{t.wishlist.count(items.length)}</p>
      {items.length === 0 ? (
        <EmptyState title={t.wishlist.empty}>
          <Link href="/" className="link-accent">
            {t.collection.browse}
          </Link>{" "}
          {t.wishlist.emptyBody}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map(({ id, card }) => (
            <article key={id} className="surface-hover flex flex-col rounded-2xl border border-line bg-white p-3">
              <Link href={`/cards/${card.slug}`}>
                <CardImage image={card.image} name={card.name} rarity={card.rarity} />
              </Link>
              <div className="mt-3 flex-1">
                <p className="text-xs text-muted">
                  #{card.cardNumber} · {card.series.name}
                </p>
                <Link href={`/cards/${card.slug}`} className="mt-0.5 line-clamp-2 block text-sm font-semibold leading-snug text-ink hover:text-brand-700">
                  {card.name}
                </Link>
                <div className="mt-1">
                  <RarityBadge rarity={card.rarity} />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Link href={`/cards/${card.slug}`} className="btn btn-secondary w-full">
                  {t.card.viewDetails}
                </Link>
                <CardActions cardId={card.id} cardName={card.name} loggedIn next="/wishlist" wishlisted ownedQty={states.owned.get(card.id) ?? 0} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
