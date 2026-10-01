import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminGetCard, adminListAllSeriesOptions, listRarities } from "@naruto-ccg/database";
import { CardForm } from "@/components/forms";
import { PageHeader, StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Ubah kartu" };

export default async function EditCardPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const [card, seriesOptions, rarities] = await Promise.all([params.then((p) => adminGetCard(p.id)), adminListAllSeriesOptions(), listRarities()]);
  if (!card || card.archivedAt) notFound();
  return (
    <>
      <PageHeader title={`Ubah kartu: ${card.name}`} subtitle={<StatusBadge status={card.status} />} />
      <CardForm
        seriesOptions={seriesOptions}
        rarities={rarities}
        initial={{
          id: card.id,
          seriesId: card.seriesId,
          cardNumber: card.cardNumber,
          name: card.name,
          slug: card.slug,
          description: card.description ?? "",
          rarity: card.rarity,
          cardType: card.cardType,
          status: card.status,
          imageUrl: imageUrl(card.image),
          attributes: card.attributes.map((a) => ({ name: a.name, value: a.value })),
        }}
      />
    </>
  );
}
