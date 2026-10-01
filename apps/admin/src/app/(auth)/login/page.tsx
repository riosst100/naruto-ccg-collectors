import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/forms";
import { getCurrentAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Masuk" };

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect("/");
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h1 className="text-xl font-bold">Naruto CCG Admin</h1>
        <p className="mb-5 mt-1 text-sm text-slate-500">Masuk administrator</p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
