import Link from "next/link";
import { cardTypeLabel, rarityLabel } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { imageUrl } from "@/lib/urls";
import { CardActions } from "./forms";
import { HoloCard, type RarityTier } from "./holo-card";

export interface TileCard {
  id: string;
  slug: string;
  name: string;
  cardNumber: string;
  rarity: string;
  cardType: string;
  image: string | null;
}

export function rarityTier(rarity: string): RarityTier {
  return rarity === "Langka Rahasia" ? "secret" : rarity === "Ultra Langka" ? "ultra" : rarity === "Super Langka" ? "super" : rarity === "Langka" ? "rare" : "common";
}

export async function RarityBadge({ rarity }: { rarity: string }) {
  const t = await getDictionary();
  const tone =
    rarity === "Langka Rahasia"
      ? "bg-black text-brand-500 ring-brand-500"
      : rarity === "Ultra Langka"
        ? "bg-brand-500 text-black ring-brand-600"
        : rarity === "Super Langka"
          ? "bg-sky-100 text-sky-800 ring-sky-300"
          : rarity === "Langka"
            ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
            : "bg-panel text-muted ring-line";
  return <span className={`badge rounded-md text-[11px] font-semibold ring-1 ring-inset ${tone}`}>{rarityLabel(t, rarity)}</span>;
}

export async function CardImage({ image, name, rarity = "", className = "" }: { image: string | null; name: string; rarity?: string; className?: string }) {
  const t = await getDictionary();
  return (
    <HoloCard tier={rarityTier(rarity)} className={className}>
      {image ? (
        <img src={imageUrl(image)!} alt={name} loading="lazy" className="aspect-[5/7] w-full bg-panel object-cover" />
      ) : (
        <div className="flex aspect-[5/7] w-full items-center justify-center bg-panel text-muted">{t.card.noImage}</div>
      )}
    </HoloCard>
  );
}

export async function CardTile({
  card,
  loggedIn,
  next,
  wishlisted,
  ownedQty,
}: {
  card: TileCard;
  loggedIn: boolean;
  next: string;
  wishlisted: boolean;
  ownedQty: number;
}) {
  const t = await getDictionary();
  return (
    <article className="surface-hover flex flex-col rounded-2xl border border-line bg-white p-3">
      <Link href={`/cards/${card.slug}`}>
        <CardImage image={card.image} name={card.name} rarity={card.rarity} />
      </Link>
      <div className="mt-3 flex-1">
        <p className="text-xs font-semibold text-brand-700">#{card.cardNumber}</p>
        <Link href={`/cards/${card.slug}`} className="mt-0.5 line-clamp-2 block text-sm font-semibold leading-snug text-ink hover:text-brand-700">
          {card.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <RarityBadge rarity={card.rarity} />
          <span className="text-muted">{cardTypeLabel(t, card.cardType)}</span>
        </div>
      </div>
      <div className="mt-3">
        <CardActions cardId={card.id} cardName={card.name} loggedIn={loggedIn} next={next} wishlisted={wishlisted} ownedQty={ownedQty} />
      </div>
    </article>
  );
}
