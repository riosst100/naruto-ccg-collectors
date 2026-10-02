"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type ActionState } from "@naruto-ccg/shared";
import { ActionButton, Field, PasswordInput, FormMessage, Modal, SubmitButton, useActionForm } from "@naruto-ccg/ui";
import { loginAction, registerAction } from "@/lib/actions/auth";
import { useDictionary } from "@/lib/i18n/client";
import { addToWishlistAction, removeFromWishlistAction } from "@/lib/actions/wishlist";
import { addToCollectionAction, deleteImageAction, updateCollectionAction, uploadImagesAction } from "@/lib/actions/collection";

// ---------- auth ----------

export function LoginForm({ next }: { next: string }) {
  const { state, onSubmit, pending } = useActionForm(loginAction);
  const t = useDictionary().auth;
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label={t.email} error={state?.fieldErrors?.email}>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </Field>
      <Field label={t.password} error={state?.fieldErrors?.password}>
        <PasswordInput name="password" required autoComplete="current-password" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="remember" defaultChecked /> {t.remember}
      </label>
      <SubmitButton pending={pending} className="w-full" pendingText={t.loggingIn}>
        {t.login}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        {t.newHere}{" "}
        <Link className="link-accent" href={`/register?next=${encodeURIComponent(next)}`}>
          {t.registerNow}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const { state, onSubmit, pending } = useActionForm(registerAction);
  const t = useDictionary().auth;
  const e = state?.fieldErrors;
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label={t.fullName} error={e?.username}>
        <input name="username" required minLength={3} maxLength={60} autoComplete="name" className="input" />
      </Field>
      <Field label={t.email} error={e?.email}>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </Field>
      <Field label={t.password} error={e?.password} hint={t.passwordHint}>
        <PasswordInput name="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label={t.confirmPassword} error={e?.confirmPassword}>
        <PasswordInput name="confirmPassword" required autoComplete="new-password" />
      </Field>
      <SubmitButton pending={pending} className="w-full" pendingText={t.creating}>
        {t.createAccount}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        {t.haveAccount}{" "}
        <Link className="link-accent" href={`/login?next=${encodeURIComponent(next)}`}>
          {t.login}
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
  const t = useDictionary().actions;
  if (!loggedIn) {
    const href = `/login?next=${encodeURIComponent(next)}`;
    return (
      <div className="flex flex-wrap gap-2">
        <Link href={href} className="btn btn-secondary flex-1">
          {t.wishlist}
        </Link>
        <Link href={href} className="btn btn-primary flex-1">
          {t.addCollection}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <ActionButton
        action={wishlisted ? removeFromWishlistAction : addToWishlistAction}
        fields={{ cardId }}
        className={wishlisted ? "btn-secondary flex-1 !border-rose-500 !text-rose-600" : "btn-secondary flex-1"}
        title={wishlisted ? t.removeWishlist : t.addWishlist}
      >
        {wishlisted ? t.inWishlist : t.wishlist}
      </ActionButton>
      <Modal trigger={ownedQty > 0 ? t.addCollectionQty(ownedQty) : t.addCollection} triggerClassName="btn-primary flex-1" title={t.addToCollectionTitle(cardName)}>
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
  const t = useDictionary().collectionForm;

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
        <Field label={t.quantity} error={e?.quantity}>
          <input name="quantity" type="number" min={1} max={9999} defaultValue={item?.quantity ?? 1} required className="input" />
        </Field>
        <Field label={t.buyPrice} error={e?.buyPrice}>
          <input name="buyPrice" inputMode="numeric" defaultValue={item?.buyPrice ?? ""} placeholder={t.optional} className="input" />
        </Field>
        <Field label={t.sellPrice} error={e?.sellPrice}>
          <input name="sellPrice" inputMode="numeric" defaultValue={item?.sellPrice ?? ""} placeholder={t.optional} className="input" />
        </Field>
      </div>
      <Field label={t.notes} error={e?.notes}>
        <textarea name="notes" rows={2} maxLength={1000} defaultValue={item?.notes ?? ""} className="input" />
      </Field>
      {mode === "add" && <p className="text-xs text-muted">{t.mergeHint}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className="btn btn-secondary" onClick={close}>
          {t.cancel}
        </button>
        <SubmitButton pending={pending}>{mode === "add" ? t.add : t.save}</SubmitButton>
      </div>
    </form>
  );
}

// ---------- collection item extras ----------

export function EditItemModal(props: { item: NonNullable<Parameters<typeof CollectionForm>[0]["item"]>; cardName: string }) {
  const t = useDictionary().collectionForm;
  return (
    <Modal trigger={t.edit} triggerClassName="btn-secondary" title={t.editTitle(props.cardName)}>
      {(close) => <CollectionForm mode="edit" item={props.item} close={close} />}
    </Modal>
  );
}

export function ImageUploader({ itemId }: { itemId: string }) {
  const { state, onSubmit, pending } = useActionForm(uploadImagesAction);
  // Previews are tied to the action state at selection time; once a later upload succeeds they disappear.
  const [selection, setSelection] = useState<{ files: { name: string; url: string }[]; baseline: ActionState } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const t = useDictionary().images;

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
        <label className="btn btn-secondary cursor-pointer !px-3 !py-1.5 focus-within:ring-2 focus-within:ring-brand-500/50">
          {t.add}
          <input
            ref={input}
            type="file"
            name="images"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(ev) =>
              setSelection({ files: Array.from(ev.target.files ?? []).map((f) => ({ name: f.name, url: URL.createObjectURL(f) })), baseline: state })
            }
          />
        </label>
        {previews.length > 0 && (
          <SubmitButton pending={pending} pendingText={t.uploading} className="!px-3 !py-1.5">
            {t.upload(previews.length)}
          </SubmitButton>
        )}
      </div>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {previews.map((p) => (
            <img key={p.url} src={p.url} alt={t.preview(p.name)} className="h-16 w-12 rounded-md border border-line object-cover" />
          ))}
        </div>
      )}
    </form>
  );
}

export function DeleteImageButton({ imageId }: { imageId: string }) {
  const t = useDictionary().images;
  return (
    <ActionButton
      action={deleteImageAction}
      fields={{ imageId }}
      className="!absolute right-0.5 top-0.5 !h-5 !w-5 !rounded-full !bg-black/70 !p-0 !text-xs text-white"
      title={t.delete}
      confirm={{ title: t.deleteTitle, message: t.deleteMessage, confirmLabel: t.deleteConfirm }}
    >
      ×
    </ActionButton>
  );
}
