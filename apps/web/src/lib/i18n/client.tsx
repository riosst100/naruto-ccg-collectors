"use client";

import { createContext, useContext, type ReactNode } from "react";
import { UiStringsProvider } from "@naruto-ccg/ui";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { dictionaries, type Dictionary } from "./dictionaries";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);

/** Only the locale crosses the server/client boundary; dictionaries contain functions and are imported here. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <Ctx.Provider value={locale}>
      <UiStringsProvider strings={dictionaries[locale].ui}>{children}</UiStringsProvider>
    </Ctx.Provider>
  );
}

export const useDictionary = (): Dictionary => dictionaries[useContext(Ctx)];
