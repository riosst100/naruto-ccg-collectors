"use client";

import { useId, type ReactNode } from "react";
import { cx } from "./cx";
import { useUiStrings } from "./strings";

/**
 * Native <dialog> modal with a trigger button. `children` may be a render function
 * receiving `close` so forms can close the dialog after a successful submit.
 */
export function Modal({
  trigger,
  title,
  children,
  triggerClassName,
  triggerTitle,
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  triggerClassName?: string;
  triggerTitle?: string;
}) {
  const id = useId();
  const strings = useUiStrings();
  const dialog = () => document.getElementById(id) as HTMLDialogElement | null;
  const close = () => dialog()?.close();
  return (
    <>
      <button type="button" title={triggerTitle} className={cx("btn", triggerClassName)} onClick={() => dialog()?.showModal()}>
        {trigger}
      </button>
      <dialog
        id={id}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto w-full max-w-md rounded-xl border border-black/10 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-black/50 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-3 dark:border-white/10">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" aria-label={strings.close} onClick={close} className="rounded p-1 text-xl leading-none opacity-60 hover:opacity-100">
            ×
          </button>
        </div>
        <div className="p-5">{typeof children === "function" ? children(close) : children}</div>
      </dialog>
    </>
  );
}
