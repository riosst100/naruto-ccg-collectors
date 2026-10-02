import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-white/20 dark:bg-white/[0.03]">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm opacity-70">{children}</div>}
    </div>
  );
}
