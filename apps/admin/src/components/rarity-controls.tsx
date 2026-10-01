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
    <form ref={form} method="post" onSubmit={onSubmit} className="mb-6 max-w-md space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <FormMessage state={state} />
      <Field label="Tambah kelangkaan" error={state?.fieldErrors?.name} hint="Ditambahkan di peringkat terendah; atur urutannya dengan tombol ↑ ↓.">
        <div className="flex gap-2">
          <input name="name" required maxLength={40} placeholder="mis. SSR" className="input" />
          <SubmitButton pending={pending} pendingText="Menambah…">
            Tambah
          </SubmitButton>
        </div>
      </Field>
    </form>
  );
}

export function RenameRarityButton({ id, name }: { id: string; name: string }) {
  return (
    <Modal trigger="Ubah nama" triggerClassName="btn-secondary" title={`Ubah nama “${name}”`}>
      {(close) => <RenameForm id={id} name={name} close={close} />}
    </Modal>
  );
}

function RenameForm({ id, name, close }: { id: string; name: string; close: () => void }) {
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
      <Field label="Nama baru" error={state?.fieldErrors?.name} hint="Semua kartu dengan kelangkaan ini ikut berganti nama.">
        <input name="name" required maxLength={40} defaultValue={name} className="input" />
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
