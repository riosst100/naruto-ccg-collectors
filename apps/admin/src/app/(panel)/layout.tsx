import { adminLogoutAction } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/shell";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate for every panel page. Server Actions re-check on their own (layouts do not run for actions).
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
        <span className="font-bold tracking-tight">Naruto CCG Admin</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden opacity-80 sm:inline">
            {admin.username} · {admin.email}
          </span>
          <form action={adminLogoutAction}>
            <button className="rounded-lg border border-white/30 px-3 py-1 hover:bg-white/10">Keluar</button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <aside className="bg-slate-800 md:w-56 md:shrink-0">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
