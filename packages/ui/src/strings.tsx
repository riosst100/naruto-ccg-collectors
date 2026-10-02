"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Built-in labels of the shared components; an app can override them (e.g. per locale) with <UiStringsProvider>. */
export interface UiStrings {
  saving: string;
  cancel: string;
  confirm: string;
  close: string;
  genericError: string;
  showPassword: string;
  hidePassword: string;
}

export const DEFAULT_UI_STRINGS: UiStrings = {
  saving: "Menyimpan…",
  cancel: "Batal",
  confirm: "Konfirmasi",
  close: "Tutup",
  genericError: "Terjadi kesalahan.",
  showPassword: "Tampilkan sandi",
  hidePassword: "Sembunyikan sandi",
};

const Ctx = createContext<UiStrings>(DEFAULT_UI_STRINGS);

export function UiStringsProvider({ strings, children }: { strings: UiStrings; children: ReactNode }) {
  return <Ctx.Provider value={strings}>{children}</Ctx.Provider>;
}

export const useUiStrings = (): UiStrings => useContext(Ctx);
