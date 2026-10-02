import Link from "next/link";
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

export function RarityBadge({ rarity }: { rarity: string }) {
  const tone =
    rarity === "Langka Rahasia"
      ? "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/40 shadow-[0_0_12px_-2px_rgb(217_70_239_/_0.6)]"
      : rarity === "Ultra Langka"
        ? "bg-amber-400/15 text-amber-300 ring-amber-300/40 shadow-[0_0_12px_-2px_rgb(251_191_36_/_0.5)]"
        : rarity === "Super Langka"
          ? "bg-sky-400/15 text-sky-300 ring-sky-300/40"
          : rarity === "Langka"
            ? "bg-emerald-400/15 text-emerald-300 ring-emerald-300/40"
            : "bg-white/10 text-slate-300 ring-white/15";
  return <span className={`badge ring-1 ring-inset ${tone}`}>{rarity}</span>;
}

export function CardImage({ image, name, rarity = "", className = "" }: { image: string | null; name: string; rarity?: string; className?: string }) {
  return (
    <HoloCard tier={rarityTier(rarity)} className={className}>
      {image ? (
        <img src={imageUrl(image)!} alt={name} loading="lazy" className="aspect-[5/7] w-full bg-white/10 object-cover" />
      ) : (
        <div className="flex aspect-[5/7] w-full items-center justify-center bg-white/10 text-slate-400">No image</div>
      )}
    </HoloCard>
  );
}

export function CardTile({
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
  return (
    <article className="glass surface-hover flex flex-col rounded-2xl p-3">
      <Link href={`/cards/${card.slug}`}>
        <CardImage image={card.image} name={card.name} rarity={card.rarity} />
      </Link>
      <div className="mt-3 flex-1">
        <p className="text-xs font-medium text-slate-400">#{card.cardNumber}</p>
        <Link href={`/cards/${card.slug}`} className="font-semibold hover:text-brand-400">
          {card.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <RarityBadge rarity={card.rarity} />
          <span className="text-slate-400">{card.cardType}</span>
        </div>
      </div>
      <div className="mt-3">
        <CardActions cardId={card.id} cardName={card.name} loggedIn={loggedIn} next={next} wishlisted={wishlisted} ownedQty={ownedQty} />
      </div>
    </article>
  );
}
