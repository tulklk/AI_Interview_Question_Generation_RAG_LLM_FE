import { Info } from "lucide-react";

/** Banner for admin pages that are still UI-only and not connected to live data. */
export function AdminPreviewNotice({ message }: { message: string }) {
  return (
    <div
      role="note"
      className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
    >
      <Info size={14} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
