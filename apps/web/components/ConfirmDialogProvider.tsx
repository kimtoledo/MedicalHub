"use client";
import { createContext, useCallback, useContext, useState } from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type PendingConfirm = ConfirmOptions & { resolve: (value: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmDialog = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );
  const close = useCallback(
    (value: boolean) => {
      pending?.resolve(value);
      setPending(null);
    },
    [pending],
  );
  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {pending && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={pending.title ?? "Confirm"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => close(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
          >
            {pending.title && <h2 className="text-lg font-bold text-violet-950">{pending.title}</h2>}
            <p className="mt-2 text-sm text-slate-600">{pending.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => close(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                {pending.cancelLabel ?? "No"}
              </button>
              <button
                onClick={() => close(true)}
                className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${pending.tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-violet-600 hover:bg-violet-700"}`}
              >
                {pending.confirmLabel ?? "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirmDialog = useContext(ConfirmContext);
  if (!confirmDialog) throw new Error("useConfirm must be used within ConfirmDialogProvider");
  return confirmDialog;
}
