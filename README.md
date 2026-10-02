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

### Seeder (data katalog)

`pnpm db:seed` memuat **katalog nyata** dari `packages/database/prisma/seed-data/catalog.json` (urutan kelangkaan, seri, kartu, atribut) beserta gambar seri lokal di `seed-data/uploads/`, lalu membuat akun admin dan demo. Seeder idempoten: data yang sudah ada tidak ditimpa, jadi aman dijalankan ulang.

- Perbarui fixture dari database saat ini: `pnpm db:export-catalog` (untuk database lain: `DATABASE_URL=file:/path/naruto.db UPLOAD_DIR=/path/uploads pnpm db:export-catalog`). Hanya katalog yang diekspor: **pengguna, hash kata sandi, wishlist, dan koleksi tidak ikut**; kartu yang diarsipkan dilewati.
- `SEED_PROFILE=demo pnpm db:seed` memuat data demo palsu (5 seri, wishlist dan koleksi contoh); dipakai oleh tes e2e.

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

## Docker (WSL)

Compose berjalan dalam **mode dev**: image `naruto-ccg:dev` (stage `dev` di Dockerfile) hanya berisi Node + pnpm, folder proyek di-mount ke `/app`, dan `web`/`admin` menjalankan `next dev`, jadi perubahan kode langsung ter-reload tanpa build ulang. `node_modules` diambil dari folder proyek di WSL, jadi jalankan `pnpm install` di WSL setelah dependensi berubah. Compose menjalankan `migrate` (sekali, menerapkan migrasi), lalu `web` (port 3000) dan `admin` (port 3001). **Database SQLite dan folder upload disimpan di filesystem WSL** (bukan di dalam image), sehingga data tetap ada saat container dibuat ulang. Image produksi (`next build` + `next start`) tetap bisa dibuat dengan `docker build -t naruto-ccg:latest .`.

```bash
# di dalam WSL (Ubuntu), dari folder proyek (mis. /mnt/d/naruto-ccg)
bash docker/setup-wsl.sh --import-dev-data     # buat ~/naruto-ccg-data + docker/compose.env; opsional impor data dev
docker compose --env-file docker/compose.env up -d   # --build hanya perlu bila Dockerfile berubah
```

- **Domain:** https://naruto-ccg.local (situs) dan https://naruto-ccg.local/admin (admin). Container `proxy` (Caddy, port `PROXY_PORT`=8080) meneruskan `/admin` ke admin dan sisanya ke web. Di mesin ini domain dan HTTPS (`tls internal`) disediakan Caddy milik **lotwork**: proyek "Naruto CCG (Docker)" sudah terdaftar di sana (domain `naruto-ccg.local` → port 8080); Caddyfile lotwork dibuat otomatis dari daftar proyeknya, jadi jangan diedit manual. Entri hosts (`127.0.0.1 naruto-ccg.local`) ditulis lotwork bila dijalankan sebagai Administrator, atau jalankan `powershell -ExecutionPolicy Bypass -File docker\add-hosts.ps1` di PowerShell Administrator. Tanpa lotwork: pakai http://naruto-ccg.local:8080 (butuh `COOKIE_SECURE=false`).
- Akses langsung tanpa domain: web `http://localhost:${WEB_PORT}`, admin `http://localhost:${ADMIN_PORT}/admin` (bawaan 3000/3001; di mesin ini 3200/3201 karena `pnpm dev` memakai 3000/3001).
- Data: `~/naruto-ccg-data` (`naruto.db`, `uploads/`); dari Windows: `\wsl$\Ubuntu-24.04\home\<user>\naruto-ccg-data`. Ubah lokasi lewat `DATA_DIR` di `docker/compose.env`. **Backup = salin folder itu.**
- Port bentrok dengan `pnpm dev`? Ubah `WEB_PORT` / `ADMIN_PORT` di `docker/compose.env`.
- Database kosong? Isi data contoh: `SEED_ADMIN_PASSWORD='...' SEED_USER_PASSWORD='...' docker compose --env-file docker/compose.env run --rm seed` (kata sandi wajib diisi; kata sandi bawaan ditolak di produksi). Atau impor data dev dengan `--import-dev-data`.
- `COOKIE_SECURE=true` (di `compose.env`) karena situs diakses lewat HTTPS; cookie `Secure` tetap diterima di `http://localhost`, tetapi tidak di http biasa dengan nama host lain. Set `false` hanya bila memakai http polos (mis. http://naruto-ccg.local:8080 tanpa lotwork).
- Lihat log: `docker compose --env-file docker/compose.env logs -f web admin`. Hentikan: `docker compose --env-file docker/compose.env down` (data aman).
