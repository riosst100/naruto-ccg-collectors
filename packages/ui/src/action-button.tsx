"use client";

import { useRef, useTransition, type ReactNode } from "react";
import type { ActionState } from "@naruto-ccg/shared";
import { cx } from "./cx";
import { useToast } from "./toast";

/**
 * Button that invokes a Server Action with hidden fields, shows a toast with the result,
 * and optionally asks for confirmation first (native dialog).
 */
export function ActionButton({
  action,
  fields = {},
  children,
  className,
  confirm,
  title,
  disabled,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionState | void>;
  fields?: Record<string, string>;
  children: ReactNode;
  className?: string;
  confirm?: { title: string; message: string; confirmLabel?: string };
  title?: string;
  disabled?: boolean;
  onSuccess?: () => void;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);

  function run() {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    start(async () => {
      const res = await action(fd);
      if (res?.ok === false) toast.error(res.error ?? "Terjadi kesalahan.");
      else {
        if (res?.message) toast.success(res.message);
        onSuccess?.();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={pending || disabled}
        className={cx("btn", className, pending && "opacity-60")}
        onClick={() => (confirm ? dialog.current?.showModal() : run())}
      >
        {children}
      </button>
      {confirm && (
        <dialog
          ref={dialog}
          className="m-auto w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-black/50 dark:bg-slate-900 dark:text-slate-100"
        >
          <h2 className="text-base font-semibold">{confirm.title}</h2>
          <p className="mt-2 text-sm opacity-80">{confirm.message}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => dialog.current?.close()}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                dialog.current?.close();
                run();
              }}
            >
              {confirm.confirmLabel ?? "Konfirmasi"}
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
