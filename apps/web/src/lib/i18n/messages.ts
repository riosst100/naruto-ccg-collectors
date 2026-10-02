import type { ActionState } from "@naruto-ccg/shared";
import type { Locale } from "./config";

// Validation (packages/shared), service (packages/database) and upload (packages/storage) messages are written in
// Indonesian because the admin panel shares them; the web app translates them here for English visitors.
const EXACT: Record<string, string> = {
  "Wajib diisi": "Required",
  "Harus mengandung huruf": "Must contain a letter",
  "Harus mengandung angka": "Must contain a number",
  "Hanya huruf, angka, spasi, titik, apostrof, dan strip": "Only letters, numbers, spaces, periods, apostrophes and hyphens",
  "Email tidak valid": "Invalid email",
  "Kata sandi tidak cocok": "Passwords do not match",
  "Masukkan angka bulat tanpa simbol": "Enter a whole number without symbols",
  "Angka terlalu besar": "Number is too large",
  "Harus bilangan bulat": "Must be a whole number",
  "Terlalu banyak": "Too many",
  "Email ini sudah terdaftar.": "This email is already registered.",
  "Kartu tidak ditemukan.": "Card not found.",
  "Item koleksi tidak ditemukan.": "Collection item not found.",
  "Jumlah tidak boleh kurang dari 1. Hapus item jika diperlukan.": "Quantity can't be less than 1. Remove the item instead if needed.",
  "Gambar tidak ditemukan.": "Image not found.",
  "Pengguna tidak ditemukan.": "User not found.",
  "File kosong.": "The file is empty.",
  "Hanya gambar JPEG, PNG, dan WebP yang diizinkan.": "Only JPEG, PNG and WebP images are allowed.",
  "Ekstensi file tidak sesuai dengan tipe gambar.": "The file extension doesn't match the image type.",
  "Ukuran file terlalu besar.": "The file is too large.",
  "Isi file bukan gambar yang valid sesuai tipe yang dinyatakan.": "The file content is not a valid image of its declared type.",
};

const PATTERNS: [RegExp, string][] = [
  [/^Minimal (\d+) karakter$/, "At least $1 characters"],
  [/^Maksimal (\d+) karakter$/, "At most $1 characters"],
  [/^Minimal (\d+)$/, "Minimum $1"],
  [/^Jumlah tidak boleh melebihi (\d+)\.$/, "Quantity can't exceed $1."],
  [/^Maksimal (\d+) gambar per kartu\.$/, "At most $1 images per card."],
  [/^Ukuran file terlalu besar \(maks (.+)\)\.$/, "The file is too large (max $1)."],
];

export function translateMessage(message: string, locale: Locale): string {
  if (locale === "id") return message;
  if (message in EXACT) return EXACT[message];
  for (const [re, out] of PATTERNS) if (re.test(message)) return message.replace(re, out);
  return message;
}

export function localizeState<T extends ActionState>(state: T, locale: Locale): T {
  if (!state || locale === "id") return state;
  const fieldErrors = state.fieldErrors && Object.fromEntries(Object.entries(state.fieldErrors).map(([k, v]) => [k, translateMessage(v, locale)]));
  return { ...state, error: state.error && translateMessage(state.error, locale), fieldErrors };
}
