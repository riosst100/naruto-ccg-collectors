"use client";

import { useActionState, useEffect, useState, startTransition, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@naruto-ccg/shared";
import { cx } from "./cx";
import { useUiStrings } from "./strings";
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
  pendingText,
  className,
  pending: pendingProp,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const strings = useUiStrings();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" disabled={pending} className={cx("btn btn-primary", className, pending && "opacity-60")}>
      {pending ? (pendingText ?? strings.saving) : children}
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
    <p role="alert" className="whitespace-pre-line rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-300">
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

/** Password input with a show/hide toggle. Accepts the usual <input> props; `type` is managed internally. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  const strings = useUiStrings();
  const label = visible ? strings.hidePassword : strings.showPassword;
  return (
    <span className="relative block">
      <input {...props} type={visible ? "text" : "password"} className={cx("input pr-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:text-brand-500 dark:hover:text-slate-200"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          {visible ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.1 4.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
              <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
            </>
          ) : (
            <>
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </span>
  );
}
