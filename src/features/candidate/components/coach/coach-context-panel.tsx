"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Pencil, Target } from "lucide-react";
import { cn } from "@/lib/cn";
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
    // Mục tiêu không được thấp hơn cấp hiện tại (vd. Junior → Fresher).
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
    // SCRUM-458: skill do CV + framework/KB chọn lúc Start Diagnostic — không gửi từ form.
    await onSave({
      targetRole: targetRole.trim(),
      selfAssessedLevel: selfLevel,
      targetLevel,
      yearsOfExperience: years.trim() ? Number(years) : undefined,
    });
  }

  if (loading && !context) {
    return (
      <div className="hr-glass-card px-5 py-8 flex items-center justify-center gap-2 text-[13px] text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        {p.loadingPlan}
      </div>
    );
  }

  // Chế độ xem gọn khi đã confirm và không đang edit
  if (context?.contextConfirmed && !editing) {
    return (
      <div className="hr-glass-card overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
            <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.contextTitle}</p>
            <p className={cn("text-[11px]", portalSubtextAlt)}>{p.contextConfirmedBadge}</p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-700 hover:border-primary/40 transition-colors"
          >
            <Pencil size={12} />
            {p.editGoal}
          </button>
        </div>
        <div className="px-5 py-4 grid sm:grid-cols-2 gap-3 text-[12px]">
          <div>
            <p className={cn("text-[10px] uppercase tracking-wide font-semibold", portalSubtextAlt)}>
              {p.targetRoleLabel}
            </p>
            <p className={cn("font-medium mt-0.5", portalHeadingAlt)}>
              {context.targetRole || "—"}
            </p>
          </div>
          <div>
            <p className={cn("text-[10px] uppercase tracking-wide font-semibold", portalSubtextAlt)}>
              {p.targetLevelLabel}
            </p>
            <p className={cn("font-medium mt-0.5", portalHeadingAlt)}>
              {context.targetLevel || "—"}
            </p>
          </div>
          {context.matchedFrameworkId ? (
            <div className="sm:col-span-2">
              <p className={cn("text-[10px] uppercase tracking-wide font-semibold", portalSubtextAlt)}>
                Framework
              </p>
              <p className={cn("font-medium mt-0.5", portalHeadingAlt)}>
                {context.matchedFrameworkRole} / {context.matchedFrameworkLevel}
              </p>
            </div>
          ) : context.resolutionMode === "ADAPTIVE" ? (
            <div className="sm:col-span-2 rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50/70 dark:bg-violet-950/20 px-3 py-2 text-violet-800 dark:text-violet-200">
              {p.adaptivePersonalized}
            </div>
          ) : (
            <div className="sm:col-span-2 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 text-amber-800 dark:text-amber-200">
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
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
          <Target size={14} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{p.contextTitle}</p>
          <p className={cn("text-[11px]", portalSubtextAlt)}>{p.contextSubtitle}</p>
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

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
        {goalChanged && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
            {p.reportWillBeReplaced}
          </div>
        )}

        {context?.suggestedRole && (
          <p className={cn("text-[12px]", portalSubtextAlt)}>
            {p.suggestedRoleLabel}:{" "}
            <span className="font-semibold text-primary">{context.suggestedRole}</span>
          </p>
        )}

        <label className="block">
          <span className={cn("text-[11px] font-semibold", portalHeadingAlt)}>{p.targetRoleLabel}</span>
          <input
            list="coach-framework-roles"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13px]"
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
          <p className={cn("text-[11px] mt-1", portalSubtextAlt)}>{p.roleCatalogHint}</p>
          {targetRole.trim() &&
            (context?.availableFrameworks?.length ?? 0) > 0 &&
            !context?.availableFrameworks.some(
              (fw) =>
                fw.displayRole.toLowerCase() === targetRole.trim().toLowerCase() ||
                fw.roleKey.toLowerCase() === targetRole.trim().toLowerCase()
            ) &&
            context?.resolutionMode === "UNSUPPORTED" && (
              <p className="text-[11px] mt-1 text-amber-700 dark:text-amber-300">{p.unsupportedRole}</p>
            )}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={cn("text-[11px] font-semibold", portalHeadingAlt)}>
              {p.selfLevelLabel}
            </span>
            <select
              value={selfLevel}
              onChange={(e) => {
                const next = e.target.value;
                setSelfLevel(next);
                // Nâng mục tiêu nếu đang thấp hơn cấp hiện tại mới chọn.
                if (levelRank(targetLevel) < levelRank(next)) setTargetLevel(next);
              }}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13px]"
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={cn("text-[11px] font-semibold", portalHeadingAlt)}>{p.targetLevelLabel}</span>
            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13px]"
            >
              {targetLevelOptions.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className={cn("text-[11px]", portalSubtextAlt)}>{p.levelPrepHint}</p>
        <p className={cn("text-[11px]", portalSubtextAlt)}>{p.levelOrderHint}</p>

        {catalogMatch ? (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-950/20 px-3 py-2 text-[12px] text-emerald-900 dark:text-emerald-100">
            <p className="font-semibold">{p.frameworkPreviewLabel}</p>
            <p className="mt-0.5">
              {catalogMatch.displayRole}
              {catalogMatch.technology ? ` · ${catalogMatch.technology}` : ""}
              {catalogMatch.levels.length > 0 ? ` · ${catalogMatch.levels.join("/")}` : ""}
            </p>
          </div>
        ) : targetRole.trim() ? (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 text-[12px] text-amber-800 dark:text-amber-200">
            {p.frameworkPreviewNone}
            {context?.resolutionMode === "ADAPTIVE" && (
              <p className="mt-1">{p.adaptivePersonalized}</p>
            )}
            {context?.resolutionMode === "UNSUPPORTED" && (
              <p className="mt-1">{p.unsupportedRole}</p>
            )}
          </div>
        ) : null}

        <label className="block">
          <span className={cn("text-[11px] font-semibold", portalHeadingAlt)}>
            {p.yearsLabel}
          </span>
          <input
            type="number"
            min={0}
            max={40}
            value={years}
            onChange={(e) => setYears(e.target.value)}
            className="mt-1 w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-[13px]"
          />
        </label>

        <p className={cn("text-[11px] rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2", portalSubtextAlt)}>
          {p.skillsFromSystemHint}
        </p>

        <button
          type="submit"
          disabled={!canSave || saving}
          className="shimmer-button hr-cta-btn inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          {p.saveContext}
        </button>
      </form>
    </div>
  );
}
