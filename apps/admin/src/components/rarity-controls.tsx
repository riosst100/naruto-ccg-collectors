"use client";

import { useEffect, useRef } from "react";
import { Field, FormMessage, Modal, SubmitButton, useActionForm } from "@naruto-ccg/ui";
import { createRarityAction, renameRarityAction } from "@/lib/actions/rarities";

export function AddRarityForm() {
  const { state, onSubmit, pending } = useActionForm(createRarityAction);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} method="post" onSubmit={onSubmit} className="mb-6 max-w-2xl space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium">Tambah kelangkaan</p>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-start gap-2">
        <div className="w-32">
          <Field label="Kode" error={state?.fieldErrors?.name}>
            <input name="name" required maxLength={40} placeholder="mis. SSR" className="input" />
          </Field>
        </div>
        <div className="min-w-48 flex-1">
          <Field label="Nama" error={state?.fieldErrors?.label}>
            <input name="label" maxLength={80} placeholder="mis. Super Super Rare" className="input" />
          </Field>
        </div>
        <div className="pt-6">
          <SubmitButton pending={pending} pendingText="Menambah…">
            Tambah
          </SubmitButton>
        </div>
      </div>
      <p className="text-xs opacity-60">Ditambahkan di peringkat terendah; atur urutannya dengan tombol ↑ ↓.</p>
    </form>
  );
}

export function RenameRarityButton({ id, name, label }: { id: string; name: string; label: string | null }) {
  return (
    <Modal trigger="Ubah" triggerClassName="btn-secondary" triggerTitle={`Ubah ${name}`} title={`Ubah “${name}”`}>
      {(close) => <RenameForm id={id} name={name} label={label} close={close} />}
    </Modal>
  );
}

function RenameForm({ id, name, label, close }: { id: string; name: string; label: string | null; close: () => void }) {
  const { state, onSubmit, pending } = useActionForm(renameRarityAction);
  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      close();
    }
  }, [state, close]);
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <Field label="Kode" error={state?.fieldErrors?.name} hint="Semua kartu dengan kelangkaan ini ikut memakai kode baru.">
        <input name="name" required maxLength={40} defaultValue={name} className="input" />
      </Field>
      <Field label="Nama" error={state?.fieldErrors?.label} hint="Nama lengkap, mis. Super Rare. Boleh dikosongkan.">
        <input name="label" maxLength={80} defaultValue={label ?? ""} className="input" />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={close}>
          Batal
        </button>
        <SubmitButton pending={pending}>Simpan</SubmitButton>
      </div>
    </form>
  );
}
