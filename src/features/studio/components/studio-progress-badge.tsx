"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { normalizePathname } from "@/shared/utils/nav";

type StudioTask = "streaming" | "generating" | null;

const STUDIO_TASK_KEY = "studio_active_task";
const STUDIO_ACTIVE_PROJECT_KEY = "studio_active_project_id";
const STUDIO_BADGE_DISMISSED_KEY = "studio_badge_dismissed";

type StudioTaskPayload = {
  task: StudioTask;
  projectId: string | null;
  /** Extra fields (startedAt, kind) are ignored — tolerate for LS forward-compat */
};

type DismissedRun = {
  task: "streaming" | "generating";
  projectId: string | null;
};

function runKey(task: StudioTask, projectId: string | null): string | null {
  if (task !== "streaming" && task !== "generating") return null;
  return `${task}|${projectId ?? ""}`;
}

function readDismissedRun(): DismissedRun | null {
  try {
    const raw = sessionStorage.getItem(STUDIO_BADGE_DISMISSED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DismissedRun;
    if (parsed.task === "streaming" || parsed.task === "generating") {
      return { task: parsed.task, projectId: parsed.projectId ?? null };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeDismissedRun(task: "streaming" | "generating", projectId: string | null) {
  try {
    sessionStorage.setItem(
      STUDIO_BADGE_DISMISSED_KEY,
      JSON.stringify({ task, projectId } satisfies DismissedRun)
    );
  } catch {
    /* ignore */
  }
}

function clearDismissedRun() {
  try {
    sessionStorage.removeItem(STUDIO_BADGE_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
}

function isDismissedFor(task: StudioTask, projectId: string | null): boolean {
  if (task !== "streaming" && task !== "generating") return false;
  const stored = readDismissedRun();
  if (!stored) return false;
  return stored.task === task && (stored.projectId ?? null) === (projectId ?? null);
}

/** SCRUM-402: đọc JSON { task, projectId, ... } hoặc legacy string "generating"|"streaming" */
function parseTaskPayload(raw: string | null): StudioTaskPayload {
  if (!raw) return { task: null, projectId: null };
  if (raw === "streaming" || raw === "generating") {
    return { task: raw, projectId: null };
  }
  try {
    const parsed = JSON.parse(raw) as {
      task?: StudioTask;
      projectId?: string | null;
      startedAt?: string;
      kind?: string;
    };
    if (parsed.task === "streaming" || parsed.task === "generating") {
      return { task: parsed.task, projectId: parsed.projectId ?? null };
    }
  } catch {
    /* ignore */
  }
  return { task: null, projectId: null };
}

function readTaskPayload(): StudioTaskPayload {
  try {
    return parseTaskPayload(localStorage.getItem(STUDIO_TASK_KEY));
  } catch {
    return { task: null, projectId: null };
  }
}

function goToStudio(router: ReturnType<typeof useRouter>, projectId: string | null) {
  if (projectId) {
    try {
      localStorage.setItem(STUDIO_ACTIVE_PROJECT_KEY, projectId);
    } catch {
      /* ignore */
    }
  }
  router.push("/hr/generate-question");
}

export function StudioProgressBadge() {
  const [mounted, setMounted] = useState(false);
  const [task, setTask] = useState<StudioTask>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);
  const lastRunKeyRef = useRef<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  // trailingSlash: true → pathname is "/hr/generate-question/"
  const onStudioPage = normalizePathname(pathname) === "/hr/generate-question";

  function applyTask(nextTask: StudioTask, nextProjectId: string | null) {
    const nextKey = runKey(nextTask, nextProjectId);
    const prevKey = lastRunKeyRef.current;

    if (!nextTask) {
      lastRunKeyRef.current = null;
      clearDismissedRun();
      setDismissed(false);
    } else if (nextKey !== prevKey) {
      lastRunKeyRef.current = nextKey;
      // New run → show again unless this exact run was already dismissed
      setDismissed(isDismissedFor(nextTask, nextProjectId));
    }
    // Same-task rebroadcast: keep dismissed as-is

    setTask(nextTask);
    setProjectId(nextProjectId);
  }

  useEffect(() => {
    setMounted(true);
    const payload = readTaskPayload();
    const key = runKey(payload.task, payload.projectId);
    lastRunKeyRef.current = key;
    setTask(payload.task);
    setProjectId(payload.projectId);
    setDismissed(isDismissedFor(payload.task, payload.projectId));
  }, []);

  useEffect(() => {
    function handleCustom(e: Event) {
      const detail = (e as CustomEvent<{ task: StudioTask; projectId?: string | null }>).detail;
      applyTask(detail.task, detail.projectId ?? null);
    }
    function handleStorage(e: StorageEvent) {
      if (e.key !== STUDIO_TASK_KEY) return;
      const payload = parseTaskPayload(e.newValue);
      applyTask(payload.task, payload.projectId);
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

  if (!mounted || !task || dismissed || onStudioPage) return null;

  const title = task === "generating" ? chip.generatingQuestions : chip.creatingPlan;
  const subtitle = task === "generating" ? chip.badgeGeneratingSub : chip.badgeStreamingSub;

  function handleDismiss(e: MouseEvent) {
    e.stopPropagation();
    if (task === "streaming" || task === "generating") {
      writeDismissedRun(task, projectId);
    }
    setDismissed(true);
  }

  const badge = (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-1">
      <div
        role="button"
        tabIndex={0}
        onClick={() => goToStudio(router, projectId)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            goToStudio(router, projectId);
          }
        }}
        className={cn(
          "relative flex items-center gap-2.5 pl-3 pr-3 py-2.5 rounded-2xl shadow-2xl select-none",
          "bg-white dark:bg-gray-900",
          "border border-gray-100 dark:border-gray-800",
          "w-64 cursor-pointer",
          "transition-all ease-[cubic-bezier(0.34,1.56,0.64,1)] duration-350",
          "hover:shadow-violet-200/50 dark:hover:shadow-violet-900/30 hover:border-violet-200 dark:hover:border-violet-800",
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
          onClick={handleDismiss}
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
