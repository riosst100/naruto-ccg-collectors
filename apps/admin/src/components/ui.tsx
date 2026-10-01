import Link from "next/link";
import type { ReactNode } from "react";
import { imageUrl } from "@/lib/urls";

export { StatusBadge, Table, td, th } from "./table";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

/** GET search form that keeps other filters as hidden inputs. */
export function SearchBar({ placeholder, q, hidden = {}, children }: { placeholder: string; q?: string; hidden?: Record<string, string | undefined>; children?: ReactNode }) {
  return (
    <form role="search" className="mb-4 flex flex-wrap items-center gap-2">
      {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <input name="q" defaultValue={q} placeholder={placeholder} className="input max-w-xs" />
      {children}
      <button className="btn btn-primary">Cari</button>
      {(q || Object.values(hidden).some(Boolean)) && (
        <Link href="?" className="btn btn-ghost">
          Atur ulang
        </Link>
      )}
    </form>
  );
}


export function Thumb({ image, alt, wide }: { image: string | null; alt: string; wide?: boolean }) {
  const cls = wide ? "h-10 w-16" : "h-14 w-10";
  return image ? <img src={imageUrl(image)!} alt={alt} className={`${cls} rounded border border-slate-200 object-cover`} /> : <div className={`${cls} rounded bg-slate-100`} />;
}

export function qs(params: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v));
}

export function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim().slice(0, 100) || undefined;
}

export function pageNum(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 && n < 100000 ? n : 1;
}
