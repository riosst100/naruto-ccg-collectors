"use client";

import { useEffect, useRef } from "react";
import { ActionButton, Field, FormMessage, SubmitButton, useActionForm } from "@naruto-ccg/ui";
import { removeAvatarAction, updateProfileAction, uploadAvatarAction } from "@/lib/actions/profile";
import { useDictionary } from "@/lib/i18n/client";
import { Avatar } from "./avatar";

export function AvatarEditor({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const { state, onSubmit, pending } = useActionForm(uploadAvatarAction);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const t = useDictionary().profile;

  // Clear the picker after every attempt so choosing the same file again re-triggers onChange.
  useEffect(() => {
    if (state && input.current) input.current.value = "";
  }, [state]);

  return (
    <div className="flex flex-col items-center text-center">
      <Avatar name={name} src={avatarUrl} className={`h-32 w-32 text-4xl ring-2 ${pending ? "opacity-60" : ""}`} />
      <form ref={form} method="post" onSubmit={onSubmit} className="mt-4 w-full space-y-3">
        <FormMessage state={state} />
        <div className="flex flex-wrap justify-center gap-2">
          <label className={`btn btn-secondary cursor-pointer ${pending ? "pointer-events-none opacity-60" : ""}`}>
            {pending ? t.uploading : t.choosePhoto}
            <input
              ref={input}
              type="file"
              name="avatar"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={pending}
              onChange={(e) => {
                if (e.target.files?.length) form.current?.requestSubmit();
              }}
            />
          </label>
          {avatarUrl && (
            <ActionButton
              action={removeAvatarAction}
              className="btn-ghost"
              confirm={{ title: t.removePhotoTitle, message: t.removePhotoMessage, confirmLabel: t.removePhoto }}
            >
              {t.removePhoto}
            </ActionButton>
          )}
        </div>
        <p className="text-xs text-muted">{t.photoHint}</p>
      </form>
    </div>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { state, onSubmit, pending } = useActionForm(updateProfileAction);
  const dict = useDictionary();
  const t = dict.profile;
  return (
    <form method="post" onSubmit={onSubmit} className="space-y-4">
      <FormMessage state={state} />
      <Field label={dict.auth.fullName} error={state?.fieldErrors?.username}>
        <input name="username" defaultValue={name} required minLength={3} maxLength={60} autoComplete="name" className="input" />
      </Field>
      <Field label={dict.auth.email} hint={t.emailHint}>
        <input type="email" value={email} readOnly disabled className="input cursor-not-allowed opacity-60" />
      </Field>
      <SubmitButton pending={pending}>{t.save}</SubmitButton>
    </form>
  );
}
