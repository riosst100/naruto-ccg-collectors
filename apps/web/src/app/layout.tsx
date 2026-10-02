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
    <html lang="id" className="dark">
      <body className="flex min-h-screen flex-col">
        <ToastProvider>
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[#090b14]/70 text-white backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
              <Link href="/" aria-label="Naruto CCG × Kayou — beranda" className="flex items-center gap-3">
                <img src="/logo_naruto.svg" alt="Naruto" className="h-9 w-auto" />
                <img src="/logo_kayou.svg" alt="Kayou" className="h-[10px] w-auto" />
              </Link>
              <nav className="flex flex-1 items-center gap-1 text-sm">
                <Link href="/" className="rounded-lg px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
                  Seri
                </Link>
                <Link href="/wishlist" className="rounded-lg px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
                  Wishlist
                </Link>
                <Link href="/collection" className="rounded-lg px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
                  Koleksi
                </Link>
              </nav>
              <div className="flex items-center gap-3 text-sm">
                {user ? (
                  <>
                    <span className="hidden opacity-80 sm:inline">Halo, {user.username}</span>
                    <form action={logoutAction}>
                      <button className="rounded-lg border border-white/20 px-3 py-1.5 transition hover:bg-white/10">Keluar</button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="rounded-lg px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
                      Masuk
                    </Link>
                    <Link href="/register" className="rounded-lg bg-gradient-to-r from-brand-500 to-amber-500 px-3 py-1.5 font-semibold text-slate-950 shadow-[0_0_20px_-4px_rgb(249_115_22_/_0.7)] transition hover:brightness-110">
                      Daftar
                    </Link>
                  </>
                )}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400">
            Pelacak koleksi buatan penggemar. Tidak berafiliasi dengan franchise Naruto maupun pemegang haknya.
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
