"use client";

import Link from "next/link";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/shared/providers/toast-context";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === "error";
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 w-80 max-w-[calc(100vw-48px)] rounded-xl border shadow-elevation-card px-4 py-3.5 text-sm",
              toast.exiting ? "animate-toast-out" : "animate-toast-in",
              isError
                ? "bg-red-50 border-red-200 dark:bg-red-950/95 dark:border-red-800/80"
                : "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/95 dark:border-emerald-800/80"
            )}
          >
            <div
              className={cn(
                "shrink-0 mt-0.5",
                isError ? "text-red-500 dark:text-red-400" : "text-emerald-500 dark:text-emerald-400"
              )}
            >
              {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            </div>

            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "leading-snug font-medium",
                  isError ? "text-red-700 dark:text-red-200" : "text-emerald-700 dark:text-emerald-200"
                )}
              >
                {toast.message}
              </p>
              {toast.action && (
                <Link
                  href={toast.action.href}
                  className="text-xs font-semibold text-primary dark:text-[#a78bff] underline hover:no-underline mt-1 inline-block"
                >
                  {toast.action.label}
                </Link>
              )}
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors -mt-0.5 -mr-1"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
