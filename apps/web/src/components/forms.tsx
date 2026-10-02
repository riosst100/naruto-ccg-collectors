"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type ActionState } from "@naruto-ccg/shared";
import { ActionButton, Field, FormMessage, Modal, SubmitButton, useActionForm } from "@naruto-ccg/ui";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { addToWishlistAction, removeFromWishlistAction } from "@/lib/actions/wishlist";
import { addToCollectionAction, deleteImageAction, updateCollectionAction, uploadImagesAction } from "@/lib/actions/collection";

// ---------- auth ----------

export function LoginForm({ next }: { next: string }) {
  const { state, onSubmit, pending } = useActionForm(loginAction);
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Email" error={state?.fieldErrors?.email}>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </Field>
      <Field label="Kata sandi" error={state?.fieldErrors?.password}>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="remember" defaultChecked /> Ingat saya
      </label>
      <SubmitButton pending={pending} className="w-full" pendingText="Sedang masuk…">
        Masuk
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        Baru di sini?{" "}
        <Link className="font-medium text-brand-400 underline" href={`/register?next=${encodeURIComponent(next)}`}>
          Daftar sekarang
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const { state, onSubmit, pending } = useActionForm(registerAction);
  const e = state?.fieldErrors;
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Nama pengguna" error={e?.username}>
        <input name="username" required minLength={3} maxLength={30} autoComplete="username" className="input" />
      </Field>
      <Field label="Email" error={e?.email}>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </Field>
      <Field label="Kata sandi" error={e?.password} hint="Minimal 8 karakter, dengan huruf dan angka.">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </Field>
      <Field label="Konfirmasi kata sandi" error={e?.confirmPassword}>
        <input name="confirmPassword" type="password" required autoComplete="new-password" className="input" />
      </Field>
      <SubmitButton pending={pending} className="w-full" pendingText="Membuat akun…">
        Buat akun
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        Sudah punya akun?{" "}
        <Link className="font-medium text-brand-400 underline" href={`/login?next=${encodeURIComponent(next)}`}>
          Masuk
        </Link>
      </p>
    </form>
  );
}

// ---------- wishlist / collection buttons on cards ----------

export function CardActions({
  cardId,
  loggedIn,
  next,
  wishlisted,
  ownedQty,
  cardName,
}: {
  cardId: string;
  loggedIn: boolean;
  next: string;
  wishlisted: boolean;
  ownedQty: number;
  cardName: string;
}) {
  if (!loggedIn) {
    const href = `/login?next=${encodeURIComponent(next)}`;
    return (
      <div className="flex gap-2">
        <Link href={href} className="btn btn-secondary flex-1">
          ♡ Wishlist
        </Link>
        <Link href={href} className="btn btn-primary flex-1">
          + Koleksi
        </Link>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <ActionButton
        action={wishlisted ? removeFromWishlistAction : addToWishlistAction}
        fields={{ cardId }}
        className={wishlisted ? "btn-secondary flex-1 !border-rose-400/50 !text-rose-300" : "btn-secondary flex-1"}
        title={wishlisted ? "Hapus dari wishlist" : "Tambah ke wishlist"}
      >
        {wishlisted ? "♥ Di Wishlist" : "♡ Wishlist"}
      </ActionButton>
      <Modal trigger={ownedQty > 0 ? `+ Koleksi (${ownedQty})` : "+ Koleksi"} triggerClassName="btn-primary flex-1" title={`Tambahkan “${cardName}” ke koleksi`}>
        {(close) => <CollectionForm mode="add" cardId={cardId} close={close} />}
      </Modal>
    </div>
  );
}

export function CollectionForm({
  mode,
  cardId,
  item,
  close,
}: {
  mode: "add" | "edit";
  cardId?: string;
  item?: { id: string; quantity: number; buyPrice: number | null; sellPrice: number | null; notes: string | null };
  close: () => void;
}) {
  const { state, onSubmit, pending } = useActionForm(mode === "add" ? addToCollectionAction : updateCollectionAction);
  const e = state?.fieldErrors;

  const handled = useRef<unknown>(null);
  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      close();
    }
  }, [state, close]);

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-3">
      {mode === "add" ? <input type="hidden" name="cardId" value={cardId} /> : <input type="hidden" name="itemId" value={item!.id} />}
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Jumlah" error={e?.quantity}>
          <input name="quantity" type="number" min={1} max={9999} defaultValue={item?.quantity ?? 1} required className="input" />
        </Field>
        <Field label="Harga beli (per kartu)" error={e?.buyPrice}>
          <input name="buyPrice" inputMode="numeric" defaultValue={item?.buyPrice ?? ""} placeholder="opsional" className="input" />
        </Field>
        <Field label="Harga jual (per kartu)" error={e?.sellPrice}>
          <input name="sellPrice" inputMode="numeric" defaultValue={item?.sellPrice ?? ""} placeholder="opsional" className="input" />
        </Field>
      </div>
      <Field label="Catatan" error={e?.notes}>
        <textarea name="notes" rows={2} maxLength={1000} defaultValue={item?.notes ?? ""} className="input" />
      </Field>
      {mode === "add" && <p className="text-xs text-slate-400">Jika Anda sudah memiliki kartu ini, jumlahnya akan ditambahkan ke kartu yang ada.</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-secondary" onClick={close}>
          Batal
        </button>
        <SubmitButton pending={pending}>{mode === "add" ? "Tambah ke koleksi" : "Simpan perubahan"}</SubmitButton>
      </div>
    </form>
  );
}

// ---------- collection item extras ----------

export function EditItemModal(props: { item: NonNullable<Parameters<typeof CollectionForm>[0]["item"]>; cardName: string }) {
  return (
    <Modal trigger="Ubah" triggerClassName="btn-secondary" title={`Ubah “${props.cardName}”`}>
      {(close) => <CollectionForm mode="edit" item={props.item} close={close} />}
    </Modal>
  );
}

export function ImageUploader({ itemId }: { itemId: string }) {
  const { state, onSubmit, pending } = useActionForm(uploadImagesAction);
  // Previews are tied to the action state at selection time; once a later upload succeeds they disappear.
  const [selection, setSelection] = useState<{ files: { name: string; url: string }[]; baseline: ActionState } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = selection?.files.map((f) => f.url) ?? [];
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [selection]);
  useEffect(() => {
    if (state?.ok && input.current) input.current.value = "";
  }, [state]);

  const previews = selection && !(state?.ok && state !== selection.baseline) ? selection.files : [];

  return (
    <form method="post" onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="itemId" value={itemId} />
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          name="images"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="max-w-full text-xs file:mr-2 file:rounded-md file:border-0 file:bg-white/10 file:text-slate-200 file:px-2 file:py-1 file:text-xs"
          onChange={(ev) =>
            setSelection({ files: Array.from(ev.target.files ?? []).map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), baseline: state })
          }
        />
        {previews.length > 0 && (
          <SubmitButton pending={pending} pendingText="Mengunggah…">
            Unggah {previews.length}
          </SubmitButton>
        )}
      </div>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((p) => (
            <img key={p.url} src={p.url} alt={`Pratinjau ${p.name}`} className="h-16 w-12 rounded border border-white/10 object-cover" />
          ))}
        </div>
      )}
    </form>
  );
}

export function DeleteImageButton({ imageId }: { imageId: string }) {
  return (
    <ActionButton
      action={deleteImageAction}
      fields={{ imageId }}
      className="!absolute right-0.5 top-0.5 !h-5 !w-5 !rounded-full !bg-black/70 !p-0 !text-xs text-white"
      title="Hapus gambar"
      confirm={{ title: "Hapus gambar?", message: "Foto ini akan dihapus permanen.", confirmLabel: "Hapus" }}
    >
      ×
    </ActionButton>
  );
}
