import type { Metadata } from "next";
import Link from "next/link";
import { ToastProvider } from "@naruto-ccg/ui";
import { logoutAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Koleksi Naruto CCG", template: "%s · Naruto CCG" },
  description: "Jelajahi semua seri dan kartu Naruto CCG, serta kelola wishlist dan koleksi Anda.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="id">
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <header className="sticky top-0 z-40 bg-slate-900 text-white shadow">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <Link href="/" aria-label="Naruto CCG × Kayou — beranda" className="flex items-center gap-3">
                <img src="/logo_naruto.svg" alt="Naruto" className="h-9 w-auto" />
                <img src="/logo_kayou.svg" alt="Kayou" className="h-[10px] w-auto" />
              </Link>
              <nav className="flex flex-1 items-center gap-1 text-sm">
                <Link href="/" className="rounded px-2 py-1 hover:bg-white/10">
                  Seri
                </Link>
                <Link href="/wishlist" className="rounded px-2 py-1 hover:bg-white/10">
                  Wishlist
                </Link>
                <Link href="/collection" className="rounded px-2 py-1 hover:bg-white/10">
                  Koleksi
                </Link>
              </nav>
              <div className="flex items-center gap-3 text-sm">
                {user ? (
                  <>
                    <span className="hidden opacity-80 sm:inline">Halo, {user.username}</span>
                    <form action={logoutAction}>
                      <button className="rounded-lg border border-white/30 px-3 py-1 hover:bg-white/10">Keluar</button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="rounded px-2 py-1 hover:bg-white/10">
                      Masuk
                    </Link>
                    <Link href="/register" className="rounded-lg bg-brand-600 px-3 py-1 font-medium hover:bg-brand-700">
                      Daftar
                    </Link>
                  </>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            Pelacak koleksi buatan penggemar. Tidak berafiliasi dengan franchise Naruto maupun pemegang haknya.
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
