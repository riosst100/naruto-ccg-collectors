"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CARD_TYPES, PUBLISH_STATUSES, STATUS_LABEL, slugify } from "@naruto-ccg/shared";
import { Field, FormMessage, Modal, SubmitButton, useActionForm } from "@naruto-ccg/ui";
import { adminLoginAction, changePasswordAction } from "@/lib/actions/auth";
import { createCardAction, createSeriesAction, importCardsAction, updateCardAction, updateSeriesAction } from "@/lib/actions/catalog";

export function AdminLoginForm() {
  const { state, onSubmit, pending } = useActionForm(adminLoginAction);
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Email" error={state?.fieldErrors?.email}>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </Field>
      <Field label="Kata sandi" error={state?.fieldErrors?.password}>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </Field>
      <SubmitButton pending={pending} className="w-full" pendingText="Sedang masuk…">
        Masuk
      </SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const { state, onSubmit, pending } = useActionForm(changePasswordAction);
  const e = state?.fieldErrors;
  return (
    <form method="post" onSubmit={onSubmit} className="max-w-sm space-y-3">
      <FormMessage state={state} />
      <Field label="Kata sandi saat ini" error={e?.currentPassword}>
        <input name="currentPassword" type="password" required autoComplete="current-password" className="input" />
      </Field>
      <Field label="Kata sandi baru" error={e?.newPassword} hint="Minimal 8 karakter, dengan huruf dan angka.">
        <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </Field>
      <Field label="Konfirmasi kata sandi baru" error={e?.confirmPassword}>
        <input name="confirmPassword" type="password" required autoComplete="new-password" className="input" />
      </Field>
      <SubmitButton pending={pending}>Ubah kata sandi</SubmitButton>
    </form>
  );
}

// ---------- image field ----------

function ImageField({ current, error }: { current: string | null; error?: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const shown = preview ?? current;
  return (
    <Field label="Gambar" error={error} hint="JPEG, PNG, atau WebP, maks. 5 MB.">
      <div className="flex items-start gap-3">
        {shown ? <img src={shown} alt="Current" className="h-24 w-auto rounded border border-slate-200 object-cover" /> : <div className="flex h-24 w-20 items-center justify-center rounded border border-dashed border-slate-300 text-xs text-slate-400">Tidak ada</div>}
        <div className="space-y-2">
          <input
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              setPreview((old) => {
                if (old) URL.revokeObjectURL(old);
                return f ? URL.createObjectURL(f) : null;
              });
            }}
          />
          {current && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" name="removeImage" /> Hapus gambar saat ini
            </label>
          )}
        </div>
      </div>
    </Field>
  );
}

/** Slug follows the name until the admin edits it by hand. */
function useSlug(initialName: string, initialSlug: string) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [touched, setTouched] = useState(initialSlug !== "");
  return {
    name,
    slug,
    onName: (v: string) => {
      setName(v);
      if (!touched) setSlug(slugify(v));
    },
    onSlug: (v: string) => {
      setTouched(true);
      setSlug(v);
    },
  };
}

// ---------- series ----------

export interface SeriesFormValues {
  id?: string;
  name: string;
  slug: string;
  code: string;
  description: string;
  releaseDate: string; // YYYY-MM-DD
  status: string;
  imageUrl: string | null;
}

export function SeriesForm({ initial }: { initial: SeriesFormValues }) {
  const editing = !!initial.id;
  const { state, onSubmit, pending } = useActionForm(editing ? updateSeriesAction : createSeriesAction);
  const s = useSlug(initial.name, initial.slug);
  const e = state?.fieldErrors;
  return (
    <form method="post" onSubmit={onSubmit} className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <FormMessage state={state} />
      <Field label="Nama" error={e?.name}>
        <input name="name" required maxLength={120} value={s.name} onChange={(ev) => s.onName(ev.target.value)} className="input" />
      </Field>
      <Field label="Slug" error={e?.slug} hint="Dipakai pada URL publik. Dibuat dari nama; dapat diubah.">
        <input name="slug" required maxLength={100} value={s.slug} onChange={(ev) => s.onSlug(ev.target.value)} className="input font-mono" />
      </Field>
      <Field label="Kode seri" error={e?.code} hint="Opsional. Dipakai di kolom card_series_number saat impor/ekspor kartu, mis. T4W2.">
        <input name="code" maxLength={30} defaultValue={initial.code} className="input font-mono" />
      </Field>
      <Field label="Deskripsi" error={e?.description}>
        <textarea name="description" rows={4} maxLength={5000} defaultValue={initial.description} className="input" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tanggal rilis" error={e?.releaseDate}>
          <input name="releaseDate" type="date" defaultValue={initial.releaseDate} className="input" />
        </Field>
        <Field label="Status" error={e?.status}>
          <select name="status" defaultValue={initial.status} className="input">
            {PUBLISH_STATUSES.map((v) => (
              <option key={v} value={v}>
                {STATUS_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <ImageField current={initial.imageUrl} error={e?.image} />
      <div className="flex gap-2">
        <SubmitButton pending={pending}>{editing ? "Simpan perubahan" : "Buat seri"}</SubmitButton>
        <Link href="/series" className="btn btn-secondary">
          Batal
        </Link>
      </div>
    </form>
  );
}

// ---------- cards ----------

export interface CardFormValues {
  id?: string;
  seriesId: string;
  cardNumber: string;
  name: string;
  slug: string;
  description: string;
  rarity: string;
  cardType: string;
  status: string;
  imageUrl: string | null;
  attributes: { name: string; value: string }[];
}

let rowKey = 0;
type Row = { key: number; name: string; value: string };

function AttributesEditor({ initial, error }: { initial: { name: string; value: string }[]; error?: string }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((a) => ({ ...a, key: rowKey++ })));
  const update = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) =>
    setRows((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-semibold">Atribut</legend>
      {rows.length === 0 && <p className="text-sm text-slate-500">Belum ada atribut. Tambahkan misalnya Chakra, Serangan, Efek, atau Ilustrator.</p>}
      {rows.map((row, i) => (
        <div key={row.key} className="flex items-start gap-2">
          <input name="attrName" aria-label={`Atribut ${i + 1} nama`} placeholder="Nama (mis. Chakra)" maxLength={60} value={row.name} onChange={(ev) => update(row.key, { name: ev.target.value })} className="input w-40 shrink-0" />
          <textarea name="attrValue" aria-label={`Atribut ${i + 1} nilai`} placeholder="Nilai" rows={1} maxLength={1000} value={row.value} onChange={(ev) => update(row.key, { value: ev.target.value })} className="input min-w-0 flex-1" />
          <div className="flex shrink-0 gap-1">
            <button type="button" className="btn btn-secondary !px-2" title="Naik" aria-label="Naik" disabled={i === 0} onClick={() => move(i, -1)}>
              ↑
            </button>
            <button type="button" className="btn btn-secondary !px-2" title="Turun" aria-label="Turun" disabled={i === rows.length - 1} onClick={() => move(i, 1)}>
              ↓
            </button>
            <button type="button" className="btn btn-secondary !px-2 !text-red-600" title="Hapus atribut" aria-label="Hapus atribut" onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}>
              ✕
            </button>
          </div>
        </div>
      ))}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="button" className="btn btn-secondary" onClick={() => setRows((r) => [...r, { key: rowKey++, name: "", value: "" }])}>
        + Tambah atribut
      </button>
    </fieldset>
  );
}

export function CardForm({ initial, seriesOptions, rarities }: { initial: CardFormValues; seriesOptions: { id: string; name: string }[]; rarities: string[] }) {
  const editing = !!initial.id;
  const { state, onSubmit, pending } = useActionForm(editing ? updateCardAction : createCardAction);
  const s = useSlug(initial.name, initial.slug);
  const e = state?.fieldErrors;

  return (
    <form method="post" onSubmit={onSubmit} className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seri" error={e?.seriesId}>
          <select name="seriesId" required defaultValue={initial.seriesId} className="input">
            <option value="" disabled>
              Pilih seri…
            </option>
            {seriesOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nomor kartu" error={e?.cardNumber}>
          <input name="cardNumber" required maxLength={20} defaultValue={initial.cardNumber} placeholder="001" className="input" />
        </Field>
        <Field label="Nama" error={e?.name}>
          <input name="name" required maxLength={120} value={s.name} onChange={(ev) => s.onName(ev.target.value)} className="input" />
        </Field>
        <Field label="Slug" error={e?.slug} hint="Unik secara global; dipakai di /cards/[slug].">
          <input name="slug" required maxLength={100} value={s.slug} onChange={(ev) => s.onSlug(ev.target.value)} className="input font-mono" />
        </Field>
        <Field label="Kelangkaan" error={e?.rarity} hint="Teks bebas, mis. PR, SE, BP, atau Langka.">
          <input name="rarity" required maxLength={40} list="rarity-options" defaultValue={initial.rarity} className="input" />
          <datalist id="rarity-options">
            {rarities.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </Field>
        <Field label="Tipe kartu" error={e?.cardType}>
          <select name="cardType" defaultValue={initial.cardType} className="input">
            {CARD_TYPES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Status" error={e?.status}>
          <select name="status" defaultValue={initial.status} className="input">
            {PUBLISH_STATUSES.map((v) => (
              <option key={v} value={v}>
                {STATUS_LABEL[v]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Deskripsi" error={e?.description}>
        <textarea name="description" rows={3} maxLength={5000} defaultValue={initial.description} className="input" />
      </Field>
      <ImageField current={initial.imageUrl} error={e?.image} />
      <AttributesEditor initial={initial.attributes} error={e?.attributes} />
      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <SubmitButton pending={pending}>{editing ? "Simpan perubahan" : "Buat kartu"}</SubmitButton>
        <Link href="/cards" className="btn btn-secondary">
          Batal
        </Link>
      </div>
    </form>
  );
}

// ---------- import cards ----------

export function ImportCardsButton() {
  return (
    <Modal trigger="Impor" triggerClassName="btn-secondary" title="Impor kartu (XLSX / CSV)">
      {(close) => <ImportCardsForm close={close} />}
    </Modal>
  );
}

function ImportCardsForm({ close }: { close: () => void }) {
  const { state, onSubmit, pending } = useActionForm(importCardsAction);
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      close();
    }
  }, [state, close]);

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-3">
      <FormMessage state={state} />
      <Field label="File" hint="Format .xlsx atau .csv, maksimal 5 MB dan 5000 baris.">
        <input type="file" name="file" required accept=".xlsx,.csv" className="text-sm file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1" />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="publish" className="mt-1" />
        <span>Langsung publikasikan kartu (dan seri baru) yang statusnya kosong. Jika tidak dicentang, kartu masuk sebagai Draf.</span>
      </label>
      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-medium">Format kolom</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>
            Wajib: <code>card_name</code>, <code>card_number</code>, <code>card_series_number</code> (kode seri), <code>card_rarity</code>. Opsional: <code>card_images</code> (URL gambar), <code>card_type</code>, <code>card_status</code>, <code>card_description</code>, <code>card_slug</code>, <code>card_attributes</code>.
          </li>
          <li>Kartu dicocokkan lewat kode seri + card_number: sudah ada → diperbarui, belum ada → dibuat.</li>
          <li>Seri dengan kode yang belum ada dibuat otomatis (nama &quot;Seri KODE&quot;, bisa diubah di menu Seri).</li>
          <li>card_type kosong → Ninja. card_slug kosong → dibuat otomatis (kartu lama mempertahankan slug-nya). card_images kosong → gambar lama dipertahankan.</li>
          <li>card_attributes: satu atribut per baris dengan format &quot;Nama: Nilai&quot;. Pada kartu yang sudah ada, atribut lama diganti.</li>
          <li>Jika ada satu baris yang salah, seluruh impor dibatalkan.</li>
        </ul>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={close}>
          Batal
        </button>
        <SubmitButton pending={pending} pendingText="Mengimpor…">
          Impor
        </SubmitButton>
      </div>
    </form>
  );
}
