/** Profile photo, or the name's initials on Kayou yellow when the user has no photo. */
export function Avatar({ name, src, className = "h-8 w-8 text-xs" }: { name: string; src?: string | null; className?: string }) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-brand-500/60 ${className}`;
  if (src) return <img src={src} alt="" className={`${base} object-cover`} />;
  return (
    <span aria-hidden className={`${base} bg-brand-500 font-bold uppercase text-black`}>
      {initials(name)}
    </span>
  );
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = Array.from(parts[0])[0] ?? "";
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : "";
  return (first + last).toUpperCase();
}
