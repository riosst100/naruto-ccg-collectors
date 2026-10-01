import Link from "next/link";
import { imageUrl } from "@/lib/urls";
import { CardActions } from "./forms";

export interface TileCard {
  id: string;
  slug: string;
  name: string;
  cardNumber: string;
  rarity: string;
  cardType: string;
  image: string | null;
}

export function RarityBadge({ rarity }: { rarity: string }) {
  const tone =
    rarity === "Langka Rahasia" ? "bg-fuchsia-100 text-fuchsia-800" : rarity === "Ultra Langka" ? "bg-amber-100 text-amber-800" : rarity === "Super Langka" ? "bg-sky-100 text-sky-800" : rarity === "Langka" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700";
  return <span className={`badge ${tone}`}>{rarity}</span>;
}

export function CardImage({ image, name, className = "" }: { image: string | null; name: string; className?: string }) {
  return image ? (
    <img src={imageUrl(image)!} alt={name} loading="lazy" className={`aspect-[5/7] w-full rounded-lg bg-slate-200 object-cover ${className}`} />
  ) : (
    <div className={`flex aspect-[5/7] w-full items-center justify-center rounded-lg bg-slate-200 text-slate-400 ${className}`}>No image</div>
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
    <article className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <Link href={`/cards/${card.slug}`}>
        <CardImage image={card.image} name={card.name} />
      </Link>
      <div className="mt-3 flex-1">
        <p className="text-xs font-medium text-slate-500">#{card.cardNumber}</p>
        <Link href={`/cards/${card.slug}`} className="font-semibold hover:text-brand-700">
          {card.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <RarityBadge rarity={card.rarity} />
          <span className="text-slate-600">{card.cardType}</span>
        </div>
      </div>
      <div className="mt-3">
        <CardActions cardId={card.id} cardName={card.name} loggedIn={loggedIn} next={next} wishlisted={wishlisted} ownedQty={ownedQty} />
      </div>
    </article>
  );
}
