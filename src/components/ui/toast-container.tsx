"use client";

import Link from "next/link";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/context/toast-context";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 w-80 max-w-[calc(100vw-48px)] rounded-xl border shadow-elevation-card bg-white px-4 py-3.5 text-sm ${
            toast.exiting ? "animate-toast-out" : "animate-toast-in"
          } ${toast.type === "error" ? "border-red-200" : "border-emerald-200"}`}
        >
          <div
            className={`shrink-0 mt-0.5 ${
              toast.type === "error" ? "text-red-500" : "text-emerald-500"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`leading-snug ${
                toast.type === "error" ? "text-red-700" : "text-emerald-700"
              }`}
            >
              {toast.message}
            </p>
            {toast.action && (
              <Link
                href={toast.action.href}
                className="text-xs font-semibold text-primary underline hover:no-underline mt-1 inline-block"
              >
                {toast.action.label}
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors -mt-0.5 -mr-1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
