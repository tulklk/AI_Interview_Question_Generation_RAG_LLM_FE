"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlanDetail, PlanOutlineItem, StudioSettings } from "@/features/studio/types/studio.types";
import {
  syncDistributionCounts,
  validateDistributionSum,
  validateFocusWeightSum,
} from "@/features/studio/utils/distribution-math";
import {
  hasDuplicateFocusNames,
  prepareFocusAreasForApply,
} from "@/features/studio/utils/focus-area-jd";
import { normalizeStudioSettings } from "@/features/studio/utils/normalize-studio-settings";
import { deriveLegacyQuestionTypes } from "@/features/studio/utils/ai-config-helpers";
import { normalizeOutlineItems } from "@/features/studio/components/plan-question-preview-list";

export type StudioConfigDraft = Pick<
  StudioSettings,
  | "numberOfQuestions"
  | "interviewLengthMinutes"
  | "difficulty"
  | "outputLanguage"
  | "questionDistribution"
  | "focusAreas"
  | "questionStyles"
  | "enabledCodeTemplates"
  | "contentMode"
  | "includeSampleAnswers"
  | "includeScoringRubric"
  | "questionTypes"
> & {
  outlineItems?: PlanOutlineItem[];
};

function pickDraft(settings: StudioSettings | null): StudioConfigDraft | null {
  if (!settings) return null;
  return {
    numberOfQuestions: settings.numberOfQuestions,
    interviewLengthMinutes: settings.interviewLengthMinutes,
    difficulty: settings.difficulty,
    outputLanguage: settings.outputLanguage,
    questionDistribution: syncDistributionCounts(
      settings.questionDistribution ?? [],
      settings.numberOfQuestions
    ),
    focusAreas: settings.focusAreas ?? [],
    questionStyles: settings.questionStyles ?? [],
    enabledCodeTemplates: settings.enabledCodeTemplates,
    contentMode: settings.contentMode,
    includeSampleAnswers: settings.includeSampleAnswers,
    includeScoringRubric: settings.includeScoringRubric,
    questionTypes: settings.questionTypes,
  };
}

function draftEquals(a: StudioConfigDraft | null, b: StudioConfigDraft | null): boolean {
  if (!a || !b) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Merge patch + scale distribution khi đổi số câu (giữ %, đổi count). */
export function mergeConfigDraft(
  base: StudioConfigDraft,
  patch: Partial<StudioConfigDraft>
): StudioConfigDraft {
  const next: StudioConfigDraft = { ...base, ...patch };
  const totalChanged =
    patch.numberOfQuestions != null &&
    patch.numberOfQuestions !== base.numberOfQuestions;
  const distProvided = patch.questionDistribution != null;
  const baseDist = base.questionDistribution ?? [];
  let dist = next.questionDistribution ?? [];

  if (distProvided && dist.length > 0) {
    // AI/PATCH gửi distribution — chuẩn hóa count theo numberOfQuestions đích
    dist = syncDistributionCounts(dist, next.numberOfQuestions);
  } else if (totalChanged && baseDist.length > 0) {
    // Chỉ đổi số câu ở cấu hình cơ bản — scale theo % hiện có
    dist = syncDistributionCounts(baseDist, next.numberOfQuestions);
  }

  next.questionDistribution = dist;

  if (totalChanged || distProvided || patch.questionStyles != null) {
    next.questionTypes = deriveLegacyQuestionTypes(dist, next.questionStyles ?? []);
  }

  // Preview outline: số câu = số slot còn lại
  if (patch.outlineItems != null) {
    next.outlineItems = normalizeOutlineItems(patch.outlineItems);
    next.numberOfQuestions = Math.max(5, next.outlineItems.length);
    if ((next.questionDistribution ?? []).length > 0) {
      next.questionDistribution = syncDistributionCounts(
        next.questionDistribution ?? [],
        next.numberOfQuestions
      );
      next.questionTypes = deriveLegacyQuestionTypes(
        next.questionDistribution,
        next.questionStyles ?? []
      );
    }
  }

  return next;
}

export interface UseStudioConfigOptions {
  settings: StudioSettings | null;
  currentPlan: PlanDetail | null;
}

export function useStudioConfig({ settings, currentPlan }: UseStudioConfigOptions) {
  const applied = useMemo(() => normalizeStudioSettings(settings), [settings]);
  const appliedDraft = useMemo(() => {
    const d = pickDraft(applied);
    if (!d) return null;
    const outline = normalizeOutlineItems(currentPlan?.outlineItems);
    return outline.length > 0 ? { ...d, outlineItems: outline } : d;
  }, [applied, currentPlan?.id, currentPlan?.revision, currentPlan?.outlineItems]);

  const [draft, setDraft] = useState<StudioConfigDraft | null>(appliedDraft);
  const userEditedRef = useRef(false);
  const appliedDraftRef = useRef(appliedDraft);
  appliedDraftRef.current = appliedDraft;

  useEffect(() => {
    if (!appliedDraft) {
      setDraft(null);
      userEditedRef.current = false;
      return;
    }
    if (!userEditedRef.current || draftEquals(draft, appliedDraft)) {
      setDraft(appliedDraft);
      userEditedRef.current = false;
    }
  }, [appliedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDraft = useCallback((patch: Partial<StudioConfigDraft>) => {
    userEditedRef.current = true;
    setDraft((prev) => {
      const base = prev ?? appliedDraftRef.current;
      if (!base) return prev;
      return mergeConfigDraft(base, patch);
    });
  }, []);

  const resetDraftFromApplied = useCallback(() => {
    userEditedRef.current = false;
    setDraft(appliedDraftRef.current);
  }, []);

  /**
   * SCRUM-422: Sau generate/apply — ép draft = settings server (dùng ref tránh stale closure).
   */
  const acceptServerSettings = useCallback(() => {
    userEditedRef.current = false;
    setDraft(appliedDraftRef.current);
  }, []);

  // Khi server vừa seed distribution/focus (sau tạo plan) mà draft local còn trống — sync ngay.
  useEffect(() => {
    if (!appliedDraft || !draft) return;
    const serverHasConfig =
      (appliedDraft.questionDistribution?.length ?? 0) > 0 &&
      (appliedDraft.focusAreas?.length ?? 0) > 0;
    const draftMissingConfig =
      (draft.questionDistribution?.length ?? 0) === 0 ||
      (draft.focusAreas?.length ?? 0) === 0;
    if (serverHasConfig && draftMissingConfig) {
      userEditedRef.current = false;
      setDraft(appliedDraft);
    }
  }, [appliedDraft, draft]);

  const isDirty = useMemo(
    () => Boolean(draft && appliedDraft && !draftEquals(draft, appliedDraft)),
    [draft, appliedDraft]
  );

  /** Dirty chỉ Focus/distribution/styles… — không tính outline (bước 2). */
  const isSettingsDirty = useMemo(() => {
    if (!draft || !appliedDraft) return false;
    const { outlineItems: _d, ...dRest } = draft;
    const { outlineItems: _a, ...aRest } = appliedDraft;
    return JSON.stringify(dRest) !== JSON.stringify(aRest);
  }, [draft, appliedDraft]);

  const distributionValidation = useMemo(
    () => validateDistributionSum(draft?.questionDistribution, draft?.numberOfQuestions ?? 15),
    [draft?.questionDistribution, draft?.numberOfQuestions]
  );

  const focusValidation = useMemo(
    () => validateFocusWeightSum(draft?.focusAreas),
    [draft?.focusAreas]
  );

  const hasCanonicalConfig = useMemo(() => {
    const dist = draft?.questionDistribution ?? [];
    const focus = draft?.focusAreas ?? [];
    return dist.length > 0 && focus.length > 0;
  }, [draft?.questionDistribution, draft?.focusAreas]);

  const noDuplicateFocus = useMemo(
    () => !hasDuplicateFocusNames(draft?.focusAreas),
    [draft?.focusAreas]
  );

  const isConfigValidForPlan = useMemo(
    () =>
      hasCanonicalConfig &&
      distributionValidation.valid &&
      focusValidation.valid &&
      noDuplicateFocus,
    [hasCanonicalConfig, distributionValidation.valid, focusValidation.valid, noDuplicateFocus]
  );

  const isApplied = useMemo(
    () => isConfigValidForPlan && !isSettingsDirty,
    [isConfigValidForPlan, isSettingsDirty]
  );

  const canApplyConfig = useMemo(
    () => isSettingsDirty && isConfigValidForPlan,
    [isSettingsDirty, isConfigValidForPlan]
  );

  const planStale = Boolean(currentPlan?.isSettingsStale);

  const buildApplyPayload = useCallback((): Partial<StudioSettings> | null => {
    if (!draft) return null;
    // SCRUM-433: dedupe tên + scale trọng số đúng 100% trước khi gửi BE
    return {
      ...draft,
      focusAreas: prepareFocusAreasForApply(draft.focusAreas),
    };
  }, [draft]);

  return {
    draft,
    applied,
    appliedDraft,
    isDirty,
    isSettingsDirty,
    isApplied,
    canApplyConfig,
    isConfigValidForPlan,
    planStale,
    distributionValidation,
    focusValidation,
    hasCanonicalConfig,
    updateDraft,
    resetDraftFromApplied,
    acceptServerSettings,
    buildApplyPayload,
  };
}

