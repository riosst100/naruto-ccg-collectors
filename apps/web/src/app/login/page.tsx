import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/urls";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="mx-auto max-w-sm glass rounded-2xl p-6 shadow-[0_20px_60px_-20px_rgb(249_115_22_/_0.35)]">
      <h1 className="title-glow mb-4 text-3xl">Masuk</h1>
      <LoginForm next={next} />
    </div>
  );
}
