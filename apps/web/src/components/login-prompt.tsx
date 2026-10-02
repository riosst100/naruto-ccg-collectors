import Link from "next/link";
import { EmptyState } from "@naruto-ccg/ui";

/** Shown on Wishlist / Koleksi when the visitor is not signed in. */
export function LoginPrompt({ title, next }: { title: string; next: string }) {
  const q = encodeURIComponent(next);
  return (
    <>
      <h1 className="mb-6 title-glow text-4xl">{title}</h1>
      <EmptyState title="Silakan daftar atau masuk untuk menambahkan koleksi Anda">
        <div className="mt-4 flex justify-center gap-2">
          <Link href={`/login?next=${q}`} className="btn btn-secondary">
            Masuk
          </Link>
          <Link href={`/register?next=${q}`} className="btn btn-primary">
            Daftar
          </Link>
        </div>
      </EmptyState>
    </>
  );
}
