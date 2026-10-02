import type { Metadata } from "next";
import Link from "next/link";
import { ToastProvider } from "@naruto-ccg/ui";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { imageUrl } from "@/lib/urls";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: { default: t.meta.title, template: "%s · Naruto CCG" }, description: t.meta.description };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, locale, t] = await Promise.all([getCurrentUser(), getLocale(), getDictionary()]);
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;900&display=swap" />
      </head>
      <body className="flex min-h-screen flex-col">
        <I18nProvider locale={locale}>
          <ToastProvider>
            <header className="sticky top-0 z-40 border-b border-white/10 bg-black">
              <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
                <Link href="/" aria-label={t.nav.homeLabel} className="flex items-center gap-3">
                  <img src="/logo_naruto.svg" alt="Naruto" className="h-9 w-auto" />
                  <img src="/logo_kayou.svg" alt="Kayou" className="h-[10px] w-auto" />
                </Link>
                <nav className="order-last -mx-3 flex w-full items-center overflow-x-auto md:order-none md:mx-0 md:w-auto md:flex-1">
                  <Link href="/" className="px-3 py-2 text-sm font-semibold uppercase tracking-wider text-white/75 transition hover:text-brand-500">
                    {t.nav.series}
                  </Link>
                  <Link href="/wishlist" className="px-3 py-2 text-sm font-semibold uppercase tracking-wider text-white/75 transition hover:text-brand-500">
                    {t.nav.wishlist}
                  </Link>
                  <Link href="/collection" className="px-3 py-2 text-sm font-semibold uppercase tracking-wider text-white/75 transition hover:text-brand-500">
                    {t.nav.collection}
                  </Link>
                </nav>
                <div className="ml-auto flex items-center gap-2 text-sm md:ml-0">
                  <LanguageSwitcher locale={locale} label={t.nav.language} />
                  {user ? (
                    <UserMenu name={user.username} email={user.email} avatarUrl={imageUrl(user.avatarKey)} />
                  ) : (
                    <>
                      <Link href="/login" className="px-3 py-2 text-sm font-semibold uppercase tracking-wider text-white/75 transition hover:text-brand-500">
                        {t.nav.login}
                      </Link>
                      <Link href="/register" className="btn btn-primary hover:!bg-white hover:!text-black">
                        {t.nav.register}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </header>
            <main className="flex-1 rounded-t-[28px] bg-white text-ink">
              <div className="mx-auto w-full max-w-6xl px-4 py-10 md:py-12">{children}</div>
            </main>
            <footer className="relative isolate overflow-hidden bg-black py-10 text-white">
              <div aria-hidden className="kayou-glow pointer-events-none absolute -bottom-72 left-1/2 h-[28rem] w-[60rem] -translate-x-1/2 opacity-60" />
              <div className="relative mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <img src="/logo_kayou.svg" alt="Kayou" className="mb-3 h-3.5 w-auto" />
                  <p className="page-title text-2xl !text-white">Naruto CCG</p>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-white/50">{t.footer}</p>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">© {new Date().getFullYear()} Naruto CCG</p>
              </div>
            </footer>
          </ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
