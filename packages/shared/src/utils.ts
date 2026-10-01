export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** Prices are free-form whole numbers typed by the user; no currency is attached. */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("id-ID").format(amount);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("id-ID", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(d));
}

export type ActionState = { ok: boolean; message?: string; error?: string; fieldErrors?: Record<string, string> } | null;

export function failure(error: string, fieldErrors?: Record<string, string>): NonNullable<ActionState> {
  return { ok: false, error, fieldErrors };
}

export function success(message?: string): NonNullable<ActionState> {
  return { ok: true, message };
}
