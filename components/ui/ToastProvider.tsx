"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ToastVariant = "success" | "error";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  variant?: ToastVariant;
  action?: ToastAction;
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

let nextToastId = 0;
const DEFAULT_DURATION = 3000;

// Storefront equivalent of components/admin/ToastProvider.tsx — a
// separate component since the admin one is mounted only inside
// app/admin/layout.tsx. Adds an optional action button (e.g. "Undo" on
// cart-item removal), which the admin version doesn't need.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = nextToastId++;
    const { variant = "success", action, duration = DEFAULT_DURATION } = options;
    setToasts((prev) => [...prev, { id, message, variant, action }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="fixed right-4 z-[var(--z-toast)] flex flex-col items-end gap-2"
        style={{ bottom: "calc(1rem + var(--mobile-toast-offset, 0px))" }}
      >

        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`flex items-center gap-3 rounded-[var(--radius-btn)] px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card-hover)] ${
              toast.variant === "error" ? "bg-[var(--color-discount)]" : "bg-[var(--foreground)]"
            }`}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={toast.action.onClick}
                className="font-semibold underline underline-offset-2"
              >
                {toast.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
