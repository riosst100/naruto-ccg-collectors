import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-2xl font-bold">Tidak ditemukan</h1>
      <Link href="/" className="btn btn-primary mt-4">
        Kembali ke dasbor
      </Link>
    </div>
  );
}
