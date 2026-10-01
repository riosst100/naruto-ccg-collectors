import type { Metadata } from "next";
import { SeriesForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Buat seri" };

export default async function CreateSeriesPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Buat seri" />
      <SeriesForm initial={{ name: "", slug: "", code: "", description: "", releaseDate: "", status: "DRAFT", imageUrl: null }} />
    </>
  );
}
