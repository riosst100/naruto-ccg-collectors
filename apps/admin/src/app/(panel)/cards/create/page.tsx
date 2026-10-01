import type { Metadata } from "next";
import { adminListAllSeriesOptions, listRarities } from "@naruto-ccg/database";
import { CardForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Buat kartu" };

export default async function CreateCardPage({ searchParams }: { searchParams: Promise<{ seriesId?: string }> }) {
  await requireAdmin();
  const [seriesOptions, rarities, sp] = await Promise.all([adminListAllSeriesOptions(), listRarities(), searchParams]);
  return (
    <>
      <PageHeader title="Buat kartu" />
      <CardForm
        seriesOptions={seriesOptions}
        rarities={rarities}
        initial={{
          seriesId: seriesOptions.some((s) => s.id === sp.seriesId) ? sp.seriesId! : "",
          cardNumber: "",
          name: "",
          slug: "",
          description: "",
          rarity: "Umum",
          cardType: "Ninja",
          status: "DRAFT",
          imageUrl: null,
          attributes: [],
        }}
      />
    </>
  );
}
