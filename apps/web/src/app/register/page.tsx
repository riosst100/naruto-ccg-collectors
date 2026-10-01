import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/urls";

export const metadata: Metadata = { title: "Buat akun" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="mx-auto max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-xl font-bold">Buat akun Anda</h1>
      <RegisterForm next={next} />
    </div>
  );
}
