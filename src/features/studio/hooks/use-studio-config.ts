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
import { normalizeStudioSettings, normalizeStudioDifficulty } from "@/features/studio/utils/normalize-studio-settings";
import { deriveLegacyQuestionTypes } from "@/features/studio/utils/ai-config-helpers";
import { normalizeOutlineItems, mergeOutlinePreferLocal } from "@/features/studio/components/plan-question-preview-list";

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
    // Dedupe ngay khi lấy draft từ settings — tránh nhân đôi sau race tạo plan.
    focusAreas: prepareFocusAreasForApply(settings.focusAreas),
    questionStyles: settings.questionStyles ?? [],
    enabledCodeTemplates: settings.enabledCodeTemplates,
    contentMode: settings.contentMode,
    includeSampleAnswers: settings.includeSampleAnswers,
    includeScoringRubric: settings.includeScoringRubric,
    questionTypes: settings.questionTypes,
  };
}

/**
 * Snapshot draft từ settings + plan (hoặc outline vừa Apply).
 * Dùng sau Apply để tránh race đọc appliedDraftRef còn stale.
 */
export function buildConfigDraft(
  settings: StudioSettings | null,
  plan: PlanDetail | null,
  outlineOverride?: PlanOutlineItem[] | null
): StudioConfigDraft | null {
  const normalized = normalizeStudioSettings(settings);
  const d = pickDraft(normalized);
  if (!d) return null;
  const outline = normalizeOutlineItems(outlineOverride ?? plan?.outlineItems);
  return outline.length > 0 ? { ...d, outlineItems: outline } : d;
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

  // Preview chỉ đổi slot. Không scale distribution / số câu bước 1
  // (nếu không, isSettingsDirty bật và nút Áp dụng hiện lại).
  if (patch.outlineItems != null) {
    next.outlineItems = normalizeOutlineItems(patch.outlineItems);
    next.numberOfQuestions = base.numberOfQuestions;
    next.questionDistribution = base.questionDistribution;
    next.questionTypes = base.questionTypes;
  }

  return next;
}

/** Fingerprint bước 1 — chỉ field HR chỉnh tay; bỏ noise (count, casing, order). */
function step1SettingsFingerprint(d: StudioConfigDraft): string {
  const dist = (d.questionDistribution ?? [])
    .map((x) => ({
      category: String(x.category ?? "").toLowerCase(),
      percentage: Math.round(Number(x.percentage) * 10) / 10,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
  const focus = (d.focusAreas ?? [])
    .map((f) => ({
      name: String(f.name ?? "").trim().toLowerCase(),
      weight: Math.round(Number(f.weight) * 10) / 10,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const styles = [...(d.questionStyles ?? [])].map(String).sort();
  const templates = [...(d.enabledCodeTemplates ?? [])].map(String).sort();
  return JSON.stringify({
    difficulty: normalizeStudioDifficulty(d.difficulty),
    interviewLengthMinutes: Number(d.interviewLengthMinutes) || 60,
    outputLanguage: String(d.outputLanguage ?? "Vietnamese"),
    focusAreas: focus,
    questionStyles: styles,
    enabledCodeTemplates: templates,
    contentMode: String(d.contentMode ?? "Mixed"),
    includeSampleAnswers: Boolean(d.includeSampleAnswers),
    includeScoringRubric: Boolean(d.includeScoringRubric),
    questionDistribution: dist,
  });
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
  /** Outline HR đang giữ — refresh server không được ghi đè slot vừa sửa. */
  const outlineHoldRef = useRef<PlanOutlineItem[] | null>(null);
  /** Fingerprint bước 1 vừa Apply — chặn dirty oan khi settings prop chưa kịp. */
  const lastAcceptedStep1Ref = useRef<string | null>(null);
  /** Sau Apply: chờ appliedDraft mới từ props rồi sync — tránh setTimeout + ref stale. */
  const pendingAcceptRef = useRef(false);
  const appliedDraftRef = useRef(appliedDraft);
  appliedDraftRef.current = appliedDraft;

  const overlayHeldOutline = (base: StudioConfigDraft): StudioConfigDraft => {
    const held = outlineHoldRef.current;
    if (!held?.length) return base;
    return {
      ...base,
      outlineItems: mergeOutlinePreferLocal(held, base.outlineItems),
    };
  };

  useEffect(() => {
    if (!appliedDraft) {
      setDraft(null);
      userEditedRef.current = false;
      pendingAcceptRef.current = false;
      outlineHoldRef.current = null;
      lastAcceptedStep1Ref.current = null;
      return;
    }
    setDraft((prev) => {
      if (pendingAcceptRef.current) {
        pendingAcceptRef.current = false;
        userEditedRef.current = false;
        const local = outlineHoldRef.current ?? prev?.outlineItems;
        const merged = local?.length
          ? mergeOutlinePreferLocal(local, appliedDraft.outlineItems)
          : normalizeOutlineItems(appliedDraft.outlineItems);
        if (merged.length > 0) outlineHoldRef.current = merged;
        lastAcceptedStep1Ref.current = step1SettingsFingerprint(appliedDraft);
        return merged.length > 0 ? { ...appliedDraft, outlineItems: merged } : appliedDraft;
      }
      // HR đang chỉnh bước 1 (fingerprint lệch) — giữ draft local, chỉ overlay outline hold
      if (
        prev &&
        userEditedRef.current &&
        step1SettingsFingerprint(prev) !== step1SettingsFingerprint(appliedDraft)
      ) {
        return overlayHeldOutline(prev);
      }
      userEditedRef.current = false;
      return overlayHeldOutline(appliedDraft);
    });
  }, [appliedDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDraft = useCallback((patch: Partial<StudioConfigDraft>) => {
    if (patch.outlineItems) {
      outlineHoldRef.current = normalizeOutlineItems(patch.outlineItems);
    }
    userEditedRef.current = true;
    pendingAcceptRef.current = false;
    setDraft((prev) => {
      const base = prev ?? appliedDraftRef.current;
      if (!base) return prev;
      return mergeConfigDraft(base, patch);
    });
  }, []);

  const resetDraftFromApplied = useCallback(() => {
    userEditedRef.current = false;
    pendingAcceptRef.current = true;
    outlineHoldRef.current = null;
    if (appliedDraftRef.current) setDraft(appliedDraftRef.current);
  }, []);

  /**
   * SCRUM-422: Sau generate/apply — ép draft = bản đã Apply.
   *
   * Truyền `snapshot` (build từ settings/plan vừa Apply) để UI giữ Hard/outline ngay,
   * không đọc appliedDraftRef lúc còn PRE-apply (bug: Hard → Easy/Medium).
   * Đồng thời bật pendingAccept để khi props refresh xong vẫn sync đúng server.
   */
  const acceptServerSettings = useCallback((snapshot?: StudioConfigDraft | null) => {
    userEditedRef.current = false;
    pendingAcceptRef.current = true;
    if (snapshot) {
      const outline = normalizeOutlineItems(snapshot.outlineItems);
      // Bước 1 rebuild outline mới — thay hold. Auto-save truyền outline HR vừa giữ.
      outlineHoldRef.current = outline.length > 0 ? outline : null;
      lastAcceptedStep1Ref.current = step1SettingsFingerprint(snapshot);
      setDraft(snapshot);
      return;
    }
    // Plan mới (generate): bỏ hold cũ để không đè outline plan vừa tạo
    outlineHoldRef.current = null;
    lastAcceptedStep1Ref.current = null;
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
      // Only backfill the two fields this effect actually checked — replacing the
      // whole draft here would also clobber any other field (e.g. difficulty) the
      // user is mid-editing, even though this effect never looked at those fields.
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              questionDistribution: appliedDraft.questionDistribution,
              focusAreas: prepareFocusAreasForApply(appliedDraft.focusAreas),
            }
          : {
              ...appliedDraft,
              focusAreas: prepareFocusAreasForApply(appliedDraft.focusAreas),
            }
      );
    }
  }, [appliedDraft, draft]);

  const isDirty = useMemo(
    () => Boolean(draft && appliedDraft && !draftEquals(draft, appliedDraft)),
    [draft, appliedDraft]
  );

  /** Dirty bước 1 theo fingerprint chuẩn hóa — sửa Preview/outline không làm dirty. */
  const isSettingsDirty = useMemo(() => {
    if (!draft || !appliedDraft) return false;
    const draftFp = step1SettingsFingerprint(draft);
    const appliedFp = step1SettingsFingerprint(appliedDraft);
    if (draftFp === appliedFp) {
      lastAcceptedStep1Ref.current = appliedFp;
      return false;
    }
    // Vừa Apply: draft = snapshot nhưng settings prop chưa refresh → đừng hiện nút Apply
    if (lastAcceptedStep1Ref.current && draftFp === lastAcceptedStep1Ref.current) {
      return false;
    }
    return true;
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

