"use client";

import { useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
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
  isApplying?: boolean;
  outlineDirty?: boolean;
  /** Bước 1 đang dirty → ẩn CTA outline (chỉ 1 nút tại một thời điểm) */
  settingsDirty?: boolean;
  onDraftChange: (patch: Partial<StudioConfigDraft>) => void;
  onApplyOutline: () => Promise<void> | void;
}

/**
 * Bước 2 — Live Preview slots: chỉ hiện sau khi đã Áp dụng Focus/phân bổ/styles (bước 1).
 */
export function PlanOutlinePreviewBlock({
  plan,
  draft,
  settings,
  allowedSkillNames = [],
  locked = false,
  isApplying = false,
  outlineDirty = false,
  settingsDirty = false,
  onDraftChange,
  onApplyOutline,
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

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.03] p-3 dark:border-primary/30">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/80">
          {cfg.outlinePreviewTitle}
        </p>
        <p className={cn("mt-0.5 text-[10px]", portalSubtext)}>{cfg.outlinePreviewSubtitle}</p>
      </div>

      <PlanQuestionPreviewList
        items={outlineItems}
        allowedSkills={allowedSkillNames}
        coverage={plan.coverage}
        sourceDetails={plan.sourceDetails}
        locked={!editable || isApplying}
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

      {editable &&
        !settingsDirty &&
        (outlineDirty || (outlineItems.length > 0 && !plan.outlineItems?.length)) && (
        <button
          type="button"
          disabled={isApplying || outlineItems.length < 5}
          onClick={() => void onApplyOutline()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-primary-hover disabled:opacity-40"
        >
          {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {isApplying ? s.applying : cfg.outlineApplyCta}
        </button>
      )}
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
