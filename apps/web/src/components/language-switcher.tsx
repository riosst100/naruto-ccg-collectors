"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { setLocaleAction } from "@/lib/actions/locale";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/dictionaries";

/** Inline SVG flags: emoji flags render as plain letters on Windows. */
function Flag({ locale, className = "" }: { locale: Locale; className?: string }) {
  const id = useId();
  const box = `inline-block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-white/20 ${className}`;
  if (locale === "id") {
    return (
      <svg aria-hidden viewBox="0 0 3 2" className={box}>
        <rect width="3" height="1" fill="#E70011" />
        <rect y="1" width="3" height="1" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" className={box}>
      <clipPath id={`${id}t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}t)`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
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
    // Focus the current language so arrow keys start from it.
    root.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: Locale) {
    setOpen(false);
    trigger.current?.focus();
    if (next === locale) return;
    const fd = new FormData();
    fd.set("locale", next);
    start(() => setLocaleAction(fd));
  }

  function onMenuKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={`${label}: ${dictionaries[locale].languageName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border border-white/20 bg-black py-1.5 pl-2 pr-1.5 text-xs font-semibold uppercase tracking-wider text-brand-500 transition hover:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 ${open ? "bg-brand-500/10" : ""} ${pending ? "opacity-60" : ""}`}
      >
        <Flag locale={locale} />
        <span>{locale}</span>
        <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-brand-500 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      <div
        id={menuId}
        role="menu"
        aria-label={label}
        onKeyDown={onMenuKey}
        className={`absolute right-0 top-full z-50 mt-2 w-52 origin-top-right rounded-2xl border border-brand-500/40 bg-black p-1.5 shadow-[0_16px_40px_-12px_rgb(244_209_0_/_0.35)] transition duration-150 ${open ? "visible scale-100 opacity-100" : "pointer-events-none invisible scale-95 opacity-0"}`}
      >
        <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-brand-500/70">{label}</p>
        {LOCALES.map((l) => {
          const active = l === locale;
          return (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              lang={l}
              tabIndex={open ? 0 : -1}
              onClick={() => choose(l)}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition focus-visible:outline-none ${active ? "bg-brand-500 text-black" : "text-white hover:bg-brand-500/15 hover:text-brand-500 focus-visible:bg-brand-500/15"}`}
            >
              <Flag locale={l} />
              <span className="flex-1">{dictionaries[l].languageName}</span>
              <span className="text-[11px] font-semibold uppercase opacity-60">{l}</span>
              <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-black ${active ? "" : "invisible"}`}>
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.79 6.8-6.8a1 1 0 0 1 1.4 0z" clipRule="evenodd" />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
