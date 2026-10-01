import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-bold">Tidak ditemukan</h1>
      <p className="mt-2 text-slate-600">Halaman tidak ada atau belum dipublikasikan.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Kembali ke daftar seri
      </Link>
    </div>
  );
}
