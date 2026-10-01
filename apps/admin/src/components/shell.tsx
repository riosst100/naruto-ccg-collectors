"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@naruto-ccg/ui";

const NAV: { heading?: string; items: { href: string; label: string; exact?: boolean }[] }[] = [
  { items: [{ href: "/", label: "Dasbor", exact: true }] },
  {
    heading: "Katalog",
    items: [
      { href: "/series", label: "Seri" },
      { href: "/cards", label: "Kartu" },
      { href: "/rarities", label: "Kelangkaan" },
    ],
  },
  { heading: "Pengguna", items: [{ href: "/users", label: "Daftar Pengguna" }] },
  {
    heading: "Data",
    items: [
      { href: "/collections", label: "Koleksi" },
      { href: "/wishlists", label: "Wishlist" },
    ],
  },
  { heading: "Sistem", items: [{ href: "/settings", label: "Pengaturan" }] },
];

export function Sidebar() {
  const pathname = usePathname(); // basePath already stripped
  return (
    <nav aria-label="Admin" className="flex gap-4 overflow-x-auto p-3 md:block md:space-y-5 md:p-4">
      {NAV.map((group, gi) => (
        <div key={gi} className="flex shrink-0 items-center gap-1 md:block">
          {group.heading && <p className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:block">{group.heading}</p>}
          {group.items.map((item) => {
            const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx("block whitespace-nowrap rounded-lg px-3 py-2 text-sm", active ? "bg-brand-600 font-medium text-white" : "text-slate-300 hover:bg-white/10")}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
