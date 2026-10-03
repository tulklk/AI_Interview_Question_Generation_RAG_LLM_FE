"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtext } from "@/shared/utils/portal-ui";
import type { PlanDetail, PlanOutlineItem, StudioSettings } from "@/features/studio/types/studio.types";
import type { StudioConfigDraft } from "@/features/studio/hooks/use-studio-config";
import {
  PlanQuestionPreviewList,
  normalizeOutlineItems,
} from "@/features/studio/components/plan-question-preview-list";

interface Props {
  plan: PlanDetail;
  draft: StudioConfigDraft | null;
  settings: StudioSettings | null;
  allowedSkillNames?: string[];
  locked?: boolean;
  /** Đang auto-save outline — chỉ hiện trạng thái, không khóa input */
  isSaving?: boolean;
  outlineDirty?: boolean;
  /** Bước 1 đang dirty → nhắc Áp dụng bước 1 trước */
  settingsDirty?: boolean;
  onDraftChange: (patch: Partial<StudioConfigDraft>) => void;
}

/**
 * Bước 2 — Live Preview slots: chỉ hiện sau khi đã Áp dụng Focus/phân bổ/styles (bước 1).
 * Chỉnh slot tự lưu (debounce ở studio-page) — không cần nút Áp dụng outline.
 */
export function PlanOutlinePreviewBlock({
  plan,
  draft,
  settings: _settings,
  allowedSkillNames = [],
  locked = false,
  isSaving = false,
  outlineDirty = false,
  settingsDirty: _settingsDirty = false,
  onDraftChange,
}: Props) {
  const { t } = useLanguage();
  const s = t.studioPage.settings;
  const cfg = s.config;
  const c = t.studioPage.chat;
  const editable =
    !locked &&
    plan.status !== "Approved" &&
    plan.status !== "Superseded";

  const outlineItems: PlanOutlineItem[] =
    draft?.outlineItems && draft.outlineItems.length > 0
      ? normalizeOutlineItems(draft.outlineItems)
      : normalizeOutlineItems(plan.outlineItems);

  useEffect(() => {
    if ((draft?.outlineItems?.length ?? 0) > 0) return;
    const fromPlan = normalizeOutlineItems(plan.outlineItems);
    if (fromPlan.length === 0) return;
    onDraftChange({ outlineItems: fromPlan, numberOfQuestions: fromPlan.length });
  }, [plan.id, plan.revision]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveHint = outlineItems.length < 5
    ? cfg.outlineMinSlots
    : isSaving
      ? cfg.outlineSaving
      : outlineDirty
        ? cfg.outlinePendingSave
        : cfg.outlineSaved;

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.03] p-3 dark:border-primary/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">
            {cfg.outlinePreviewTitle}
          </p>
          <p className={cn("mt-0.5 text-[10px]", portalSubtext)}>{cfg.outlinePreviewSubtitle}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
            isSaving
              ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
              : outlineDirty
                ? "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          )}
        >
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {saveHint}
        </span>
      </div>

      <PlanQuestionPreviewList
        items={outlineItems}
        allowedSkills={allowedSkillNames}
        coverage={plan.coverage}
        sourceDetails={plan.sourceDetails}
        locked={!editable}
        labels={{
          title: cfg.outlinePreviewListTitle,
          subtitle: cfg.outlinePreviewListHint,
          theory: cfg.outlineTheory,
          code: cfg.outlineCode,
          skill: s.focusAreasLabel,
          difficulty: s.difficulty,
          remove: cfg.outlineRemove,
          sourceJd: c.sourceRoleJd,
          sourceSystem: c.sourceRoleAdmin,
          sourceLlm: c.sourceRoleLlm,
          empty: cfg.outlineEmpty,
          minSlotsHint: cfg.outlineMinSlots,
          sourceChunk: c.sourceChunk,
          jobDescription: c.sourceJobDescription,
          whyAsked: cfg.outlineWhyAsked,
          whyAskedPlaceholder: cfg.outlineWhyAskedPlaceholder,
          relabeledHint: cfg.outlineRelabeledHint,
          whyAskedAutoPlaceholder: cfg.outlineWhyAskedAutoPlaceholder,
        }}
        difficultyLabels={{
          Easy: s.easyDesc,
          Medium: s.mediumDesc,
          Hard: s.hardDesc,
        }}
        onChange={(next) =>
          onDraftChange({ outlineItems: next, numberOfQuestions: next.length })
        }
      />
    </div>
  );
}

/** Gate: sau Apply bước 1 (StudioSettingsPatch) — không chặn vì planStale. */
export function shouldShowOutlinePreview(
  plan: PlanDetail | null,
  opts: { hasQuestions: boolean; planConfigAppliedOnce?: boolean }
): boolean {
  if (!plan || opts.hasQuestions) return false;
  if (plan.status === "Approved" || plan.status === "Superseded") return false;
  const byModel = (plan.generatedByModelName ?? "").trim();
  // Sau Apply cập nhật plan (StudioSettingsPatch). Giữ RAG-SettingsApply cho bản cũ đã apply.
  if (byModel === "StudioSettingsPatch" || byModel === "RAG-SettingsApply") return true;
  return Boolean(opts.planConfigAppliedOnce);
}
