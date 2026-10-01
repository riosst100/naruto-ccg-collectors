import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminGetSeries } from "@naruto-ccg/database";
import { SeriesForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { imageUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Ubah seri" };

export default async function EditSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const series = await adminGetSeries((await params).id);
  if (!series) notFound();
  return (
    <>
      <PageHeader
        title={`Ubah seri: ${series.name}`}
        subtitle={`${series.cardCount} kartu di seri ini`}
        actions={
          <Link href={`/cards?seriesId=${series.id}`} className="btn btn-secondary">
            Lihat kartu
          </Link>
        }
      />
      <SeriesForm
        initial={{
          id: series.id,
          name: series.name,
          slug: series.slug,
          code: series.code ?? "",
          description: series.description ?? "",
          releaseDate: series.releaseDate ? series.releaseDate.toISOString().slice(0, 10) : "",
          status: series.status,
          imageUrl: imageUrl(series.image),
        }}
      />
    </>
  );
}
