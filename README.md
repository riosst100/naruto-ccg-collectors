# Naruto CCG — Platform Koleksi Kartu

Monorepo pnpm berisi **situs pengguna** (`apps/web`, port 3000) dan **situs admin** (`apps/admin`, port 3001) yang memakai satu database SQLite (Prisma). Seluruh antarmuka berbahasa Indonesia.

```
apps/web        Next.js 16 – situs publik (seri, kartu, wishlist, koleksi)
apps/admin      Next.js 16 – panel admin (basePath /admin)
packages/database  Prisma schema, migrasi, seed, seluruh logika bisnis (services)
packages/auth      sesi, cookie, getCurrentUser / requireUser / createSession / deleteSession
packages/shared    konstanta, skema Zod, util (slug, uang, tanggal)
packages/storage   abstraksi penyimpanan upload (LocalStorage; siap diganti S3/R2/Cloudinary)
packages/ui        komponen UI bersama (toast, modal, tombol konfirmasi, form, paginasi)
e2e                tes Playwright (Edge)
```

## Menjalankan

Prasyarat: Node ≥ 20.12, pnpm.

```bash
pnpm install
cp .env.example .env          # satu .env di root dipakai kedua aplikasi + Prisma
pnpm prisma migrate dev       # atau: pnpm db:deploy
pnpm db:seed
pnpm dev                      # web: http://localhost:3000   admin: http://localhost:3001/admin
```

Produksi: `pnpm build` lalu `pnpm start`.

### Akun seed (HANYA untuk pengembangan)

| Peran | Email | Kata sandi |
|---|---|---|
| ADMIN | `admin@naruto-ccg.local` | `Admin#12345` |
| USER | `user@naruto-ccg.local` | `User#12345` |

Ubah lewat `SEED_*` di `.env`. Seed **menolak berjalan** dengan kata sandi bawaan bila `NODE_ENV=production`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm build` | pemeriksaan kualitas |
| `pnpm prisma validate` / `pnpm prisma migrate dev` / `pnpm db:seed` | database |
| `pnpm test` | tes layanan (vitest, DB terpisah) |
| `pnpm test:e2e` | tes end-to-end Playwright (butuh `pnpm build` dulu, memakai Microsoft Edge dan DB `data/e2e.db`) |

## Keamanan — ringkasan

- **Sesi server-side**: token acak 256-bit di cookie `HttpOnly`, `SameSite=Lax`, `Secure` di produksi; hanya hash SHA-256 token yang disimpan. Tidak ada token di localStorage.
- **Admin terpisah**: cookie berbeda (`ccg_admin_session`), cakupan sesi `ADMIN`, sesi 8 jam (cookie sesi). Peran dibaca ulang dari database di setiap request, dan **setiap Server Action admin memanggil `requireAdmin()`** (layout tidak dijalankan untuk action).
- **Kata sandi**: scrypt (N=2¹⁵) dengan salt; pesan error login generik, pembanding waktu-konstan, pembatasan percobaan login (in-memory per proses — gunakan penyimpanan bersama bila di-scale).
- **IDOR**: semua fungsi koleksi/wishlist pengguna menerima `userId` dari sesi dan selalu memfilter `{ id, userId }`. Admin hanya **membaca** koleksi/wishlist pengguna.
- **Upload**: validasi MIME + ekstensi + ukuran (5 MB) + *magic bytes*; nama file dibuat server (UUID). Foto koleksi (`collections/<userId>/…`) hanya bisa diakses pemiliknya (web) atau admin (situs admin). SVG tidak pernah diterima dari upload.
- **Konten draf** (seri/kartu `DRAFT`, kartu arsip, kartu di seri draf) tidak pernah tampil di situs publik.
- CSRF: Server Action Next.js memeriksa Origin; cookie SameSite=Lax.

## Keputusan desain

- **Hapus kartu**: bila ada pengguna yang memilikinya, kartu **diarsipkan** (`archivedAt`, hilang dari katalog, tetap tampil di koleksi pemilik dengan label "Tidak lagi ada di katalog"); bila tidak, dihapus permanen. Seri hanya bisa dihapus bila kosong.
- **Harga beli/jual** adalah angka bulat bebas yang diketik pengguna, tanpa mata uang (titik/koma pemisah ribuan diabaikan). Total nilai = harga × jumlah, dijumlahkan langsung.
- **Kolom enum** berupa string (divalidasi Zod di `@naruto-ccg/shared`) agar skema portabel ke PostgreSQL: ganti `provider` di `schema.prisma`, set `DATABASE_URL`, buat ulang migrasi. Pencarian memakai `contains` (SQLite tidak membedakan huruf besar/kecil untuk ASCII; di PostgreSQL tambahkan `mode: "insensitive"`).
- **Upload**: disajikan lewat route `/uploads/[...path]` (bukan `public/`) karena file yang ditambahkan saat runtime tidak dilayani Next di produksi. Direktori default `./uploads` (di-share kedua aplikasi), diatur lewat `UPLOAD_DIR`. Ganti implementasi `StorageDriver` untuk S3/R2/Cloudinary.
- Next.js dipin ke **16.3.7** karena kebijakan `minimumReleaseAge` pnpm 12 menolak rilis yang berumur < 1 hari; Prisma dipin ke 6.x agar SQLite tidak memerlukan driver native.
- Halaman Wishlist dan Koleksi tetap muncul di menu untuk pengunjung; bila belum masuk, tampil ajakan untuk mendaftar/masuk.
