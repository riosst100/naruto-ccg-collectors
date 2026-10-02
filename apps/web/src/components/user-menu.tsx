"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/client";
import { Avatar } from "./avatar";

const itemClass =
  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-white transition hover:bg-brand-500/15 hover:text-brand-500 focus-visible:bg-brand-500/15 focus-visible:text-brand-500 focus-visible:outline-none";

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-brand-500">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  profile: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z",
  wishlist: "M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 6a5 5 0 0 1 7.5 6.6z",
  collection: "M4 7h16M4 12h16M4 17h10",
  logout: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3",
};

function ConfirmLogoutButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn-danger ${pending ? "opacity-60" : ""}`}>
      {label}
    </button>
  );
}

export function UserMenu({ name, email, avatarUrl }: { name: string; email: string; avatarUrl: string | null }) {
  const t = useDictionary();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onMenuKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  }

  const close = () => setOpen(false);
  const links = [
    { href: "/profile", label: t.nav.profile, icon: ICONS.profile },
    { href: "/wishlist", label: t.nav.wishlist, icon: ICONS.wishlist },
    { href: "/collection", label: t.nav.collection, icon: ICONS.collection },
  ];

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={t.nav.accountMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border border-white/20 bg-black py-1 pl-1 pr-2 text-brand-500 transition hover:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 ${open ? "bg-brand-500/10" : ""}`}
      >
        <Avatar name={name} src={avatarUrl} className="h-7 w-7 text-[11px]" />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-white sm:inline">{name}</span>
        <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-brand-500 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label={t.nav.accountMenu}
        onKeyDown={onMenuKey}
        className={`absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-2xl border border-brand-500/40 bg-black p-1.5 shadow-[0_16px_40px_-12px_rgb(244_209_0_/_0.35)] transition duration-150 ${open ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0"}`}
      >
        <div className="flex items-center gap-3 px-2.5 pb-2.5 pt-1.5">
          <Avatar name={name} src={avatarUrl} className="h-10 w-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{name}</p>
            <p className="truncate text-xs text-white/50">{email}</p>
          </div>
        </div>
        <div className="my-1 border-t border-brand-500/25" />
        {links.map((l) => (
          <Link key={l.href} href={l.href} role="menuitem" tabIndex={open ? 0 : -1} onClick={close} className={itemClass}>
            <Icon d={l.icon} />
            {l.label}
          </Link>
        ))}
        <div className="my-1 border-t border-brand-500/25" />
        <button
          type="button"
          role="menuitem"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            close();
            dialog.current?.showModal();
          }}
          className={`${itemClass} !text-red-400 hover:!bg-red-500/15`}
        >
          <Icon d={ICONS.logout} />
          {t.nav.logout}
        </button>
      </div>

      <dialog
        ref={dialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        className="m-auto w-full max-w-sm rounded-2xl border-t-4 border-brand-500 bg-white p-5 text-ink shadow-2xl backdrop:bg-black/60"
      >
        <h2 className="page-title text-2xl">{t.nav.logoutTitle}</h2>
        <p className="mt-2 text-sm opacity-80">{t.nav.logoutMessage}</p>
        <form action={logoutAction} className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.close()}>
            {t.ui.cancel}
          </button>
          <ConfirmLogoutButton label={t.nav.logout} />
        </form>
      </dialog>
    </div>
  );
}
