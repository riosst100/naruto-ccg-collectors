"use client";

import { useActionState, useEffect, startTransition, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@naruto-ccg/shared";
import { cx } from "./cx";
import { useToast } from "./toast";

/**
 * Like useActionState, but submits through onSubmit so React does NOT reset the form after the action
 * (a `<form action>` is reset even when validation fails, which would wipe the user's input).
 */
export function useActionForm(action: (prev: ActionState, fd: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, null as ActionState);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending };
}

export function SubmitButton({
  children,
  pendingText = "Menyimpan…",
  className,
  pending: pendingProp,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} className={cx("btn btn-primary", className, pending && "opacity-60")}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Inline error banner for a form's action state; success results become a toast. */
export function FormMessage({ state, toastOnSuccess = true }: { state: ActionState; toastOnSuccess?: boolean }) {
  const toast = useToast();
  useEffect(() => {
    if (state?.ok && state.message && toastOnSuccess) toast.success(state.message);
  }, [state, toast, toastOnSuccess]);
  if (!state || state.ok || !state.error) return null;
  return (
    <p role="alert" className="whitespace-pre-line rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {state.error}
    </p>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs opacity-60">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
