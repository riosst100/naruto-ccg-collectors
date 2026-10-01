import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const admin = await requireAdmin();
  return (
    <>
      <PageHeader title="Pengaturan" subtitle={`Masuk sebagai ${admin.username} (${admin.email})`} />
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Ubah kata sandi</h2>
        <p className="mb-3 text-sm text-slate-500">Mengubah kata sandi akan mengeluarkan Anda dari semua perangkat lain.</p>
        <ChangePasswordForm />
      </section>
    </>
  );
}
