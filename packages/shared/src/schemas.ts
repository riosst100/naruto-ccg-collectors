import { z } from "zod";
import { CARD_TYPES, PUBLISH_STATUSES, ROLES } from "./constants";

const trimmed = (max: number) => z.string().trim().min(1, "Wajib diisi").max(max, `Maksimal ${max} karakter`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maksimal ${max} karakter`)
    .transform((v) => (v === "" ? null : v));

export const passwordSchema = z
  .string()
  .min(8, "Minimal 8 karakter")
  .max(128, "Maksimal 128 karakter")
  .regex(/[A-Za-z]/, "Harus mengandung huruf")
  .regex(/[0-9]/, "Harus mengandung angka");

/** Display name ("Nama lengkap"); stored in the `username` column. */
export const fullNameSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(3, "Minimal 3 karakter")
      .max(60, "Maksimal 60 karakter")
      .regex(/^[\p{L}\p{M}\p{N} .'-]+$/u, "Hanya huruf, angka, spasi, titik, apostrof, dan strip"),
  );

export const registerSchema = z
  .object({
    username: fullNameSchema,
    email: z.string().trim().toLowerCase().max(254).pipe(z.email("Email tidak valid")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Kata sandi tidak cocok" });

export const profileSchema = z.object({ username: fullNameSchema });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Email tidak valid")),
  password: z.string().min(1, "Wajib diisi").max(128),
  remember: z.boolean(),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Wajib diisi").max(128), newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ["confirmPassword"], message: "Kata sandi tidak cocok" });

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Wajib diisi")
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Hanya huruf kecil, angka, dan satu tanda strip");

const optionalDate = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Gunakan format TTTT-BB-HH")
  .transform((v) => (v === "" ? null : new Date(`${v}T00:00:00.000Z`)))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), "Tanggal tidak valid");

export const seriesCodeSchema = z
  .string()
  .trim()
  .max(30, "Maksimal 30 karakter")
  .refine((v) => v === "" || /^[A-Za-z0-9_-]+$/.test(v), "Hanya huruf, angka, strip, dan garis bawah")
  .transform((v) => (v === "" ? null : v));

export const seriesSchema = z.object({
  name: trimmed(120),
  slug: slugSchema,
  code: seriesCodeSchema,
  description: optionalText(5000),
  releaseDate: optionalDate,
  status: z.enum(PUBLISH_STATUSES),
});
export type SeriesInput = z.infer<typeof seriesSchema>;

/** Optional remote image (import). Uploaded images are stored separately as storage keys. */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "URL gambar harus diawali http:// atau https://")
  .transform((v) => (v === "" ? null : v))
  .optional();

export const attributeSchema = z.object({ name: trimmed(60), value: trimmed(1000) });

export const cardSchema = z.object({
  seriesId: z.string().min(1, "Pilih seri"),
  cardNumber: trimmed(30),
  name: trimmed(120),
  slug: slugSchema,
  description: optionalText(5000),
  rarity: trimmed(40), // free text: real sets use codes such as PR / SE / BP
  image: imageUrlSchema,
  cardType: z.enum(CARD_TYPES),
  status: z.enum(PUBLISH_STATUSES),
  attributes: z.array(attributeSchema).max(50, "Maksimal 50 atribut"),
});
export type CardInput = z.infer<typeof cardSchema>;

const price = z
  .string()
  .trim()
  .transform((v) => v.replace(/[.,\s]/g, "")) // tolerate "1.500" / "1,500" / "1 500"
  .refine((v) => v === "" || /^\d{1,10}$/.test(v), "Masukkan angka bulat tanpa simbol")
  .refine((v) => v === "" || Number(v) <= 2_000_000_000, "Angka terlalu besar")
  .transform((v) => (v === "" ? null : Number(v)));

const quantity = z.coerce.number().int("Harus bilangan bulat").min(1, "Minimal 1").max(9999, "Terlalu banyak");

const collectionBase = {
  buyPrice: price,
  sellPrice: price,
  notes: optionalText(1000),
};

export const addToCollectionSchema = z.object({ cardId: z.string().min(1), quantity, ...collectionBase });
export const updateCollectionSchema = z.object({ itemId: z.string().min(1), quantity, ...collectionBase });

export const roleSchema = z.enum(ROLES);

/** Turn zod issues into { field: message } (first message per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
