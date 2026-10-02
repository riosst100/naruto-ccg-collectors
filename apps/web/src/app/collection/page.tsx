import type { Metadata } from "next";
import Link from "next/link";
import { getUserCollection } from "@naruto-ccg/database";
import { formatMoney } from "@naruto-ccg/shared";
import { ActionButton, EmptyState } from "@naruto-ccg/ui";
import { CardImage, RarityBadge } from "@/components/card-tile";
import { DeleteImageButton, EditItemModal, ImageUploader } from "@/components/forms";
import { adjustQuantityAction, removeFromCollectionAction } from "@/lib/actions/collection";
import { LoginPrompt } from "@/components/login-prompt";
import { getCurrentUser } from "@/lib/auth";
import { rarityLabel } from "@/lib/i18n/dictionaries";
import { getDictionary } from "@/lib/i18n/server";
import { imageUrl } from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).collection.title };
}

export default async function CollectionPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [user, dict] = await Promise.all([getCurrentUser(), getDictionary()]);
  const t = dict.collection;
  const money = (n: number) => formatMoney(n, dict.intl);
  if (!user) return <LoginPrompt title={t.title} next="/collection" />;
  const q = (await searchParams).q?.trim().slice(0, 100) || undefined;
  const { items, summary } = await getUserCollection(user.id, { q });

  // items arrive sorted high -> low rarity; split into consecutive groups
  const groups: { rarity: string; items: typeof items }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.rarity === item.card.rarity) last.items.push(item);
    else groups.push({ rarity: item.card.rarity, items: [item] });
  }

  return (
    <>
      <h1 className="mb-4 page-title text-4xl">{t.title}</h1>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t.uniqueCards} value={money(summary.uniqueCards)} />
        <Stat label={t.totalCards} value={money(summary.totalCards)} />
        <Stat label={t.totalBuy} value={money(summary.totalBuy)} />
        <Stat label={t.totalSell} value={money(summary.totalSell)} />
      </section>

      <form className="mb-6 flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder={t.searchPlaceholder} className="input max-w-sm" />
        <button className="btn btn-secondary">{t.search}</button>
        {q && (
          <Link href="/collection" className="btn btn-ghost">
            {t.clear}
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState title={q ? t.noMatch : t.empty}>
          <Link href="/" className="link-accent">
            {t.browse}
          </Link>{" "}
          {t.emptyBody}
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.rarity} aria-label={t.rarityGroup(rarityLabel(dict, g.rarity))}>
              <h2 className="mb-3 flex flex-wrap items-baseline gap-2 border-b-[3px] border-brand-500 pb-2 page-title text-2xl">
                {rarityLabel(dict, g.rarity)}
                <span className="font-sans text-sm normal-case tracking-normal text-muted">
                  {t.groupCount(g.items.length, g.items.reduce((n, i) => n + i.quantity, 0))}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {g.items.map((item) => {
                  const { card } = item;
                  const hidden = card.status !== "PUBLISHED" || card.archivedAt;
                  const image = <CardImage image={card.image} name={card.name} rarity={card.rarity} />;
                  return (
                    <article key={item.id} className="surface-hover flex flex-col rounded-2xl border border-line bg-white p-3">
                      {hidden ? image : <Link href={`/cards/${card.slug}`}>{image}</Link>}

                      <div className="mt-3 flex-1">
                        <p className="text-xs font-semibold text-brand-700">#{card.cardNumber}</p>
                        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink">
                          {hidden ? card.name : <Link href={`/cards/${card.slug}`} className="hover:text-brand-700">{card.name}</Link>}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-muted">{card.series.name}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <RarityBadge rarity={card.rarity} />
                          {hidden && <span className="badge bg-panel text-muted">{t.notInCatalog}</span>}
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-panel-soft p-2.5 text-xs">
                          <Money label={t.buyPrice} value={item.buyPrice} format={money} />
                          <Money label={t.sellPrice} value={item.sellPrice} format={money} />
                          <Money label={t.totalBuyItem} value={item.buyPrice == null ? null : item.buyPrice * item.quantity} format={money} />
                          <Money label={t.totalSellItem} value={item.sellPrice == null ? null : item.sellPrice * item.quantity} format={money} />
                        </dl>
                        {item.notes && <p className="mt-2 line-clamp-2 text-xs italic text-muted">“{item.notes}”</p>}

                        {item.images.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.images.map((img) => (
                              <div key={img.id} className="relative">
                                <a href={imageUrl(img.imageUrl)!} target="_blank" rel="noreferrer">
                                  <img src={imageUrl(img.imageUrl)!} alt={dict.images.yourCard(card.name)} className="h-16 w-12 rounded-md border border-line object-cover" />
                                </a>
                                <DeleteImageButton imageId={img.id} />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3">
                          <ImageUploader itemId={item.id} />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                        <ActionButton action={adjustQuantityAction} fields={{ itemId: item.id, delta: "-1" }} className="btn-secondary !h-8 !w-8 !p-0" title={t.decrease} disabled={item.quantity <= 1}>
                          −
                        </ActionButton>
                        <span className="text-lg font-bold text-black" aria-label={t.quantity}>
                          ×{item.quantity}
                        </span>
                        <ActionButton action={adjustQuantityAction} fields={{ itemId: item.id, delta: "1" }} className="btn-secondary !h-8 !w-8 !p-0" title={t.increase}>
                          +
                        </ActionButton>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 *:flex-1">
                        <EditItemModal
                          cardName={card.name}
                          item={{ id: item.id, quantity: item.quantity, buyPrice: item.buyPrice, sellPrice: item.sellPrice, notes: item.notes }}
                        />
                        <ActionButton
                          action={removeFromCollectionAction}
                          fields={{ itemId: item.id }}
                          className="btn-danger"
                          confirm={{ title: t.removeTitle, message: t.removeMessage(card.name), confirmLabel: t.remove }}
                        >
                          {t.remove}
                        </ActionButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass border-l-4 !border-l-brand-500 !rounded-xl p-3 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-1 text-xl font-bold text-black sm:text-2xl">{value}</p>
    </div>
  );
}

function Money({ label, value, format }: { label: string; value: number | null; format: (n: number) => string }) {
  return (
    <div>
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className="font-semibold text-ink">{value == null ? "—" : format(value)}</dd>
    </div>
  );
}
