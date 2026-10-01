import Link from "next/link";

/** Server-rendered pagination preserving other query params. */
export function Pagination({
  page,
  pageCount,
  basePath,
  params = {},
}: {
  page: number;
  pageCount: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label="Paginasi" className="mt-4 flex items-center justify-between text-sm">
      <span className="opacity-70">
        Halaman {page} dari {pageCount}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn btn-secondary" href={href(page - 1)}>
            ← Sebelumnya
          </Link>
        ) : (
          <span className="btn btn-secondary pointer-events-none opacity-40">← Sebelumnya</span>
        )}
        {page < pageCount ? (
          <Link className="btn btn-secondary" href={href(page + 1)}>
            Berikutnya →
          </Link>
        ) : (
          <span className="btn btn-secondary pointer-events-none opacity-40">Berikutnya →</span>
        )}
      </div>
    </nav>
  );
}
