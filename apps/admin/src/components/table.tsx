import type { ReactNode } from "react";
import { STATUS_LABEL } from "@naruto-ccg/shared";

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "PUBLISHED" || status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : status === "ADMIN" ? "bg-indigo-100 text-indigo-800" : status === "DISABLED" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700";
  return <span className={`badge ${tone}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}
export const th = "whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500";
export const td = "border-b border-slate-100 px-4 py-2.5 align-middle";
