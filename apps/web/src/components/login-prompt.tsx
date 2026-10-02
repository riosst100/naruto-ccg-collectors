import Link from "next/link";
import { EmptyState } from "@naruto-ccg/ui";
import { getDictionary } from "@/lib/i18n/server";

/** Shown on Wishlist / Koleksi when the visitor is not signed in. */
export async function LoginPrompt({ title, next }: { title: string; next: string }) {
  const q = encodeURIComponent(next);
  const t = await getDictionary();
  return (
    <>
      <h1 className="mb-6 page-title text-4xl">{title}</h1>
      <EmptyState title={t.auth.promptTitle}>
        <div className="mt-4 flex justify-center gap-2">
          <Link href={`/login?next=${q}`} className="btn btn-secondary">
            {t.nav.login}
          </Link>
          <Link href={`/register?next=${q}`} className="btn btn-primary">
            {t.nav.register}
          </Link>
        </div>
      </EmptyState>
    </>
  );
}
