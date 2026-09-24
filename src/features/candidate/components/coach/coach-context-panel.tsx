"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, Pencil, Target } from "lucide-react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import type {
  CoachContext,
  CoachFrameworkOption,
  UpdateCoachContextPayload,
} from "@/features/candidate/services/coach.service";

const LEVELS = ["Fresher", "Junior", "Middle", "Senior"] as const;

function levelRank(level: string): number {
  const i = LEVELS.findIndex((l) => l.toLowerCase() === level.trim().toLowerCase());
  return i < 0 ? 0 : i;
}

interface CoachContextPanelProps {
  context: CoachContext | null;
  loading: boolean;
  saving: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (payload: UpdateCoachContextPayload) => Promise<void>;
  /** Có báo cáo scored — đổi mục tiêu sẽ thay thế thế hệ Coach cũ */
  hasExistingReport?: boolean;
}

const fieldCls =
  "mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13px] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10";

export function CoachContextPanel({
  context,
  loading,
  saving,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  hasExistingReport = false,
}: CoachContextPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;

  const [targetRole, setTargetRole] = useState("");
  const [selfLevel, setSelfLevel] = useState("Junior");
  const [targetLevel, setTargetLevel] = useState("Junior");
  const [years, setYears] = useState("");

  useEffect(() => {
    if (!context) return;
    setTargetRole(context.targetRole || context.suggestedRole || "");
    const nextSelf = context.selfAssessedLevel || "Junior";
    let nextTarget = context.targetLevel || "Junior";
    if (levelRank(nextTarget) < levelRank(nextSelf)) nextTarget = nextSelf;
    setSelfLevel(nextSelf);
    setTargetLevel(nextTarget);
    setYears(context.yearsOfExperience != null ? String(context.yearsOfExperience) : "");
  }, [context]);

  const targetLevelOptions = useMemo(
    () => LEVELS.filter((l) => levelRank(l) >= levelRank(selfLevel)),
    [selfLevel]
  );

  const catalogMatch = useMemo(() => {
    const role = targetRole.trim().toLowerCase();
    if (!role) return null;
    return (
      (context?.availableFrameworks ?? []).find(
        (fw) =>
          fw.displayRole.toLowerCase() === role || fw.roleKey.toLowerCase() === role
      ) ?? null
    );
  }, [context?.availableFrameworks, targetRole]);

  const levelOrderInvalid = levelRank(targetLevel) < levelRank(selfLevel);

  const goalChanged =
    hasExistingReport &&
    context?.contextConfirmed &&
    ((targetRole.trim() && targetRole.trim() !== (context.targetRole || "").trim()) ||
      targetLevel !== (context.targetLevel || "Junior"));

  const canSave = useMemo(
    () =>
      targetRole.trim().length > 0 &&
      targetLevel.trim().length > 0 &&
      !levelOrderInvalid,
    [targetRole, targetLevel, levelOrderInvalid]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || saving) return;
    await onSave({
      targetRole: targetRole.trim(),
      selfAssessedLevel: selfLevel,
      targetLevel,
      yearsOfExperience: years.trim() ? Number(years) : undefined,
    });
  }

  if (loading && !context) {
    return (
      <div className="hr-glass-card space-y-4 overflow-hidden px-4 py-4 sm:px-5" aria-busy>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    );
  }

  if (context?.contextConfirmed && !editing) {
    return (
      <div className="hr-glass-card overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/50">
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.contextTitle}</p>
            <p className={cn("text-[11px]", portalSubtextAlt)}>{p.contextConfirmedBadge}</p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-[12px] font-semibold transition-colors hover:border-primary/40 dark:border-gray-700"
          >
            <Pencil size={12} />
            {p.editGoal}
          </button>
        </div>
        <div className="grid gap-3 px-4 py-4 text-[12px] sm:grid-cols-2 sm:px-5">
          <div>
            <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
              {p.targetRoleLabel}
            </p>
            <p className={cn("mt-0.5 font-medium", portalHeadingAlt)}>{context.targetRole || "—"}</p>
          </div>
          <div>
            <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
              {p.targetLevelLabel}
            </p>
            <p className={cn("mt-0.5 font-medium", portalHeadingAlt)}>{context.targetLevel || "—"}</p>
          </div>
          {context.selfAssessedLevel && (
            <div>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {p.selfLevelLabel}
              </p>
              <p className={cn("mt-0.5 font-medium", portalHeadingAlt)}>{context.selfAssessedLevel}</p>
            </div>
          )}
          {context.yearsOfExperience != null && (
            <div>
              <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                {p.yearsLabel}
              </p>
              <p className={cn("mt-0.5 font-medium", portalHeadingAlt)}>{context.yearsOfExperience}</p>
            </div>
          )}
          {context.matchedFrameworkId ? (
            <div className="sm:col-span-2">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wide", portalSubtextAlt)}>
                Framework
              </p>
              <p className={cn("mt-0.5 font-medium", portalHeadingAlt)}>
                {context.matchedFrameworkRole} / {context.matchedFrameworkLevel}
              </p>
            </div>
          ) : context.resolutionMode === "ADAPTIVE" ? (
            <div className="sm:col-span-2 rounded-lg border border-violet-200 bg-violet-50/70 px-3 py-2 text-violet-800 dark:border-violet-800/50 dark:bg-violet-950/20 dark:text-violet-200">
              {p.adaptivePersonalized}
            </div>
          ) : (
            <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
              {p.unsupportedRole}
              {context.supportedRoles.length > 0 && (
                <p className="mt-1 text-[12px]">
                  {p.supportedRolesLabel}: {context.supportedRoles.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="hr-glass-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Target size={14} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[15px] font-semibold", portalHeadingAlt)}>{p.contextTitle}</p>
          <p className={cn("text-[12px] leading-snug", portalSubtextAlt)}>{p.contextSubtitle}</p>
        </div>
        {context?.contextConfirmed && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-[12px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          >
            {p.cancelEdit}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 sm:px-5">
        {goalChanged && (
          <div className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{p.reportWillBeReplaced}</span>
          </div>
        )}

        {context?.suggestedRole && (
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            {p.suggestedRoleLabel}:{" "}
            <span className="font-semibold text-primary">{context.suggestedRole}</span>
          </p>
        )}

        <label className="block">
          <span className={cn("text-sm font-medium", portalHeadingAlt)}>{p.targetRoleLabel}</span>
          <input
            list="coach-framework-roles"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className={fieldCls}
            placeholder={p.targetRolePlaceholder}
            required
          />
          <datalist id="coach-framework-roles">
            {(context?.availableFrameworks ?? []).map((fw: CoachFrameworkOption) => (
              <option key={fw.roleKey} value={fw.displayRole}>
                {[fw.technology, fw.levels.join("/")].filter(Boolean).join(" · ")}
              </option>
            ))}
          </datalist>
          <p className={cn("mt-1 text-[11px]", portalSubtextAlt)}>{p.roleCatalogHint}</p>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className={cn("text-sm font-medium", portalHeadingAlt)}>{p.selfLevelLabel}</span>
            <select
              value={selfLevel}
              onChange={(e) => {
                const next = e.target.value;
                setSelfLevel(next);
                if (levelRank(targetLevel) < levelRank(next)) setTargetLevel(next);
              }}
              className={fieldCls}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={cn("text-sm font-medium", portalHeadingAlt)}>{p.targetLevelLabel}</span>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className={fieldCls}
            >
              {targetLevelOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className={cn("text-sm font-medium", portalHeadingAlt)}>{p.yearsLabel}</span>
            <div className="relative mt-1">
              <input
                type="number"
                min={0}
                max={40}
                step="0.5"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={cn(fieldCls, "mt-0 pr-12")}
              />
              <span
                className={cn(
                  "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px]",
                  portalSubtextAlt
                )}
              >
                {p.yearsUnit}
              </span>
            </div>
          </label>
        </div>
        <p className={cn("-mt-1 text-[11px]", portalSubtextAlt)}>{p.levelOrderHint}</p>

        {catalogMatch ? (
          <div className="flex gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-[12px] text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/20 dark:text-emerald-100">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="leading-snug">
              <span className="font-semibold">{p.frameworkPreviewLabel}: </span>
              {catalogMatch.displayRole}
              {catalogMatch.technology ? ` · ${catalogMatch.technology}` : ""}
              {catalogMatch.levels.length > 0 ? ` · ${catalogMatch.levels.join("/")}` : ""}
            </p>
          </div>
        ) : targetRole.trim() ? (
          <div className="flex gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-[12px] leading-snug text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{p.frameworkPreviewNone}</span>
          </div>
        ) : null}

        <div className={cn("flex gap-2 text-[12px] leading-snug", portalSubtextAlt)}>
          <Info size={14} className="mt-0.5 shrink-0 opacity-70" />
          <span>{p.skillsFromSystemHint}</span>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <p className={cn("min-w-0 text-[11px]", portalSubtextAlt)}>
            {!canSave ? p.goalFormIncomplete : null}
          </p>
          <button
            type="submit"
            disabled={!canSave || saving}
            className="shimmer-button hr-cta-btn inline-flex h-9 shrink-0 items-center justify-center gap-2 self-end rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-50 sm:self-auto"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {p.saveContext}
          </button>
        </div>
      </form>
    </div>
  );
}
