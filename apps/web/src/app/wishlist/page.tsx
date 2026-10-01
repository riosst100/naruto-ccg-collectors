import type { Metadata } from "next";
import Link from "next/link";
import { getUserCardStates, getUserWishlist } from "@naruto-ccg/database";
import { EmptyState } from "@naruto-ccg/ui";
import { CardImage, RarityBadge } from "@/components/card-tile";
import { CardActions } from "@/components/forms";
import { LoginPrompt } from "@/components/login-prompt";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Wishlist Saya" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt title="Wishlist Saya" next="/wishlist" />;
  const items = await getUserWishlist(user.id);
  const states = await getUserCardStates(user.id, items.map((i) => i.cardId));

  return (
    <>
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Wishlist Saya</h1>
      <p className="mb-6 text-slate-600">{items.length} kartu yang Anda inginkan.</p>
      {items.length === 0 ? (
        <EmptyState title="Wishlist Anda masih kosong">
          <Link href="/" className="font-medium text-brand-700 underline">
            Jelajahi seri
          </Link>{" "}
          lalu ketuk ♡ pada kartu yang Anda inginkan.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map(({ id, card }) => (
            <article key={id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <Link href={`/cards/${card.slug}`}>
                <CardImage image={card.image} name={card.name} />
              </Link>
              <div className="mt-3 flex-1">
                <p className="text-xs text-slate-500">
                  #{card.cardNumber} · {card.series.name}
                </p>
                <Link href={`/cards/${card.slug}`} className="font-semibold hover:text-brand-700">
                  {card.name}
                </Link>
                <div className="mt-1">
                  <RarityBadge rarity={card.rarity} />
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <Link href={`/cards/${card.slug}`} className="btn btn-ghost w-full border border-slate-200">
                  Lihat detail
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
