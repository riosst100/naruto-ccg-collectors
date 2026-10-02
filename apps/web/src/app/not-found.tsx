import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getDictionary();
  return (
    <div className="py-16 text-center">
      <h1 className="page-title text-5xl">{t.notFound.title}</h1>
      <p className="mt-2 text-muted">{t.notFound.body}</p>
      <Link href="/" className="btn btn-primary mt-6">
        {t.notFound.back}
      </Link>
    </div>
  );
}
