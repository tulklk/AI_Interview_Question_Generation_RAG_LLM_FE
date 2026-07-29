"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";

type StudioTask = "streaming" | "generating" | null;

const STUDIO_TASK_KEY = "studio_active_task";

function readTask(): StudioTask {
  try { return localStorage.getItem(STUDIO_TASK_KEY) as StudioTask; }
  catch { return null; }
}

export function StudioProgressBadge() {
  const [mounted, setMounted] = useState(false);
  const [task, setTask] = useState<StudioTask>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const onStudioPage = pathname === "/hr/generate-v2";

  useEffect(() => {
    setMounted(true);
    setTask(readTask());
  }, []);

  useEffect(() => {
    function handleCustom(e: Event) {
      const t = (e as CustomEvent<{ task: StudioTask }>).detail.task;
      setTask(t);
      if (t) setDismissed(false);
    }
    function handleStorage(e: StorageEvent) {
      if (e.key !== STUDIO_TASK_KEY) return;
      const t = (e.newValue ?? null) as StudioTask;
      setTask(t);
      if (t) setDismissed(false);
    }
    window.addEventListener("studio:task-changed", handleCustom);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("studio:task-changed", handleCustom);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (task && !dismissed) {
      const t = setTimeout(() => setVisible(true), 30);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [task, dismissed]);

  const { t } = useLanguage();
  const chip = t.studioPage.chip;

  if (!mounted || !task || dismissed) return null;

  const title = task === "generating" ? chip.generatingQuestions : chip.creatingPlan;
  const subtitle = task === "generating" ? chip.badgeGeneratingSub : chip.badgeStreamingSub;

  const badge = (
    <div className={cn(
      "fixed right-6 z-50 flex flex-col items-end gap-1",
      onStudioPage ? "bottom-20" : "bottom-6"
    )}>
      <div
        role={!onStudioPage ? "button" : undefined}
        tabIndex={!onStudioPage ? 0 : undefined}
        onClick={() => { if (!onStudioPage) router.push("/hr/generate-v2"); }}
        onKeyDown={(e) => { if (!onStudioPage && (e.key === "Enter" || e.key === " ")) router.push("/hr/generate-v2"); }}
        className={cn(
          "relative flex items-center gap-2.5 pl-3 pr-3 py-2.5 rounded-2xl shadow-2xl select-none",
          "bg-white dark:bg-gray-900",
          "border border-gray-100 dark:border-gray-800",
          "w-64",
          "transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)] duration-350",
          !onStudioPage && "cursor-pointer hover:shadow-violet-200/50 dark:hover:shadow-violet-900/30 hover:border-violet-200 dark:hover:border-violet-800",
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-6 scale-95 pointer-events-none"
        )}
      >
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
        </span>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600">
          <Loader2 size={14} className="animate-spin text-white" />
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-sm font-semibold leading-tight text-gray-900 dark:text-gray-50">{title}</p>
          <p className="mt-0.5 truncate text-xs leading-tight text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
          className="shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label={t.studioPage.sources.close}
        >
          <X size={12} />
        </button>
      </div>

      <div
        className={cn(
          "flex items-center gap-1 pr-1 transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      >
        <Sparkles size={9} className="text-violet-400" />
        <span className="text-[9px] font-medium text-gray-400 dark:text-gray-500">HireGen AI</span>
      </div>
    </div>
  );

  return createPortal(badge, document.body);
}
