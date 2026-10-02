import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n/server";
import { safeNext } from "@/lib/urls";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).auth.loginTitle };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const t = await getDictionary();
  return (
    <div className="mx-auto max-w-sm glass p-7">
      <h1 className="page-title mb-6 text-4xl">{t.auth.loginTitle}</h1>
      <LoginForm next={next} />
    </div>
  );
}
