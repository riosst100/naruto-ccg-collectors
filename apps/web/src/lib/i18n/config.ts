export const LOCALES = ["en", "id"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "locale";

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** English unless overridden server-side with WEB_DEFAULT_LOCALE (used by the e2e suite). */
export const DEFAULT_LOCALE: Locale = isLocale(process.env.WEB_DEFAULT_LOCALE) ? process.env.WEB_DEFAULT_LOCALE : "en";
