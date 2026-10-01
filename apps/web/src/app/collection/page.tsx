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
import { imageUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Koleksi Saya" };

export default async function CollectionPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <LoginPrompt title="Koleksi Saya" next="/collection" />;
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
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight">Koleksi Saya</h1>

      <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Kartu Unik" value={String(summary.uniqueCards)} />
        <Stat label="Total Kartu" value={String(summary.totalCards)} />
        <Stat label="Total Nilai Beli" value={formatMoney(summary.totalBuy)} />
        <Stat label="Total Nilai Jual" value={formatMoney(summary.totalSell)} />
      </section>

      <form className="mb-6 flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Cari nama atau nomor kartu…" className="input max-w-sm" />
        <button className="btn btn-secondary">Cari</button>
        {q && (
          <Link href="/collection" className="btn btn-ghost">
            Bersihkan
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <EmptyState title={q ? "Tidak ada kartu yang cocok" : "Koleksi Anda masih kosong"}>
          <Link href="/" className="font-medium text-brand-700 underline">
            Jelajahi seri
          </Link>{" "}
          dan tambahkan kartu yang Anda miliki.
        </EmptyState>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.rarity} aria-label={`Kelangkaan ${g.rarity}`}>
              <h2 className="mb-3 flex flex-wrap items-baseline gap-2 border-b border-slate-200 pb-2 text-xl font-bold">
                {g.rarity}
                <span className="text-sm font-normal text-slate-500">
                  {g.items.length} kartu unik · {g.items.reduce((n, i) => n + i.quantity, 0)} total
                </span>
              </h2>
              <div className="space-y-4">
          {g.items.map((item) => {
            const { card } = item;
            const hidden = card.status !== "PUBLISHED" || card.archivedAt;
            return (
              <article key={item.id} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[110px_1fr]">
                <div>
                  <CardImage image={card.image} name={card.name} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-slate-500">
                        #{card.cardNumber} · {card.series.name}
                      </p>
                      <h3 className="text-lg font-semibold">
                        {hidden ? card.name : <Link href={`/cards/${card.slug}`} className="hover:text-brand-700">{card.name}</Link>}
                      </h3>
                      <div className="mt-1 flex items-center gap-2">
                        <RarityBadge rarity={card.rarity} />
                        {hidden && <span className="badge bg-slate-100 text-slate-600">Tidak lagi ada di katalog</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <ActionButton action={adjustQuantityAction} fields={{ itemId: item.id, delta: "-1" }} className="btn-secondary !px-2.5" title="Kurangi satu" disabled={item.quantity <= 1}>
                        −
                      </ActionButton>
                      <span className="min-w-8 text-center font-semibold" aria-label="Jumlah">
                        ×{item.quantity}
                      </span>
                      <ActionButton action={adjustQuantityAction} fields={{ itemId: item.id, delta: "1" }} className="btn-secondary !px-2.5" title="Tambah satu">
                        +
                      </ActionButton>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                    <Money label="Harga beli" minor={item.buyPrice} />
                    <Money label="Harga jual" minor={item.sellPrice} />
                    <Money label="Total beli" minor={item.buyPrice == null ? null : item.buyPrice * item.quantity} />
                    <Money label="Total jual" minor={item.sellPrice == null ? null : item.sellPrice * item.quantity} />
                  </dl>
                  {item.notes && <p className="mt-2 text-sm text-slate-600">“{item.notes}”</p>}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.images.map((img) => (
                      <div key={img.id} className="relative">
                        <a href={imageUrl(img.imageUrl)!} target="_blank" rel="noreferrer">
                          <img src={imageUrl(img.imageUrl)!} alt={`Kartu milik Anda: ${card.name}`} className="h-20 w-14 rounded border border-slate-200 object-cover" />
                        </a>
                        <DeleteImageButton imageId={img.id} />
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <ImageUploader itemId={item.id} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <EditItemModal
                      cardName={card.name}
                      item={{ id: item.id, quantity: item.quantity, buyPrice: item.buyPrice, sellPrice: item.sellPrice, notes: item.notes }}
                    />
                    {!hidden && (
                      <Link href={`/cards/${card.slug}`} className="btn btn-secondary">
                        Lihat detail
                      </Link>
                    )}
                    <ActionButton
                      action={removeFromCollectionAction}
                      fields={{ itemId: item.id }}
                      className="btn-danger ml-auto"
                      confirm={{ title: "Hapus dari koleksi?", message: `“${card.name}” dan fotonya akan dihapus dari koleksi Anda.`, confirmLabel: "Hapus" }}
                    >
                      Hapus
                    </ActionButton>
                  </div>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Money({ label, minor }: { label: string; minor: number | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium">{minor == null ? "—" : formatMoney(minor)}</dd>
    </div>
  );
}
