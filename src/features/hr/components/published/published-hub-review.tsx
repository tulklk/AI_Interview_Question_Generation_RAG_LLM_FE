"use client";

import { useEffect, useMemo } from "react";
import {
  renameQuestionSetTitle,
  setQuestionSetTimeLimit,
} from "@/features/interview/services/interview.service";
import type { DraftQuestionSet, GenerationSession } from "@/features/interview/types/generation-session";
import { ReviewPageClient } from "@/features/question/components/review-page-client";
import { getSettings } from "@/features/studio/services/studio.service";
import { normalizeStudioSettings } from "@/features/studio/utils/normalize-studio-settings";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";

/**
 * Studio save-draft không ghi timeLimitMinutes lên question set — chỉ có lúc publish
 * hoặc PUT /time-limit. Với DRAFT từ Studio còn null, sync một lần từ
 * interviewLengthMinutes để chip/sidebar không kẹt “Không giới hạn”.
 * (Chuyển từ trang /hr/history/[id] cũ.)
 */
async function resolveTimeLimitMinutes(draft: DraftQuestionSet): Promise<number | null> {
  if (draft.timeLimitMinutes != null && draft.timeLimitMinutes >= 1) {
    return draft.timeLimitMinutes;
  }
  if (draft.status !== "DRAFT" || !draft.sourceProjectId) {
    return draft.timeLimitMinutes ?? null;
  }
  try {
    const raw = await getSettings(draft.sourceProjectId);
    const settings = normalizeStudioSettings(raw);
    const mins = settings?.interviewLengthMinutes;
    if (mins == null || mins < 1 || mins > 480) return draft.timeLimitMinutes ?? null;
    await setQuestionSetTimeLimit(draft.id, mins).catch(() => undefined);
    return mins;
  } catch {
    return draft.timeLimitMinutes ?? null;
  }
}

interface PublishedHubReviewProps {
  draft: DraftQuestionSet;
  onDraftChange: (updater: (prev: DraftQuestionSet | null) => DraftQuestionSet | null) => void;
  onPublishStatusChange: (status: "DRAFT" | "PUBLISHED") => void;
}

/**
 * Tab "Review" của hub bộ câu hỏi: nhúng trang review cũ (/hr/history/[id]).
 * Khi bộ đã PUBLISHED, ReviewPageClient tự khóa chỉnh sửa (xem + gỡ publish để sửa).
 */
export function PublishedHubReview({ draft, onDraftChange, onPublishStatusChange }: PublishedHubReviewProps) {
  const { t } = useLanguage();
  const { addToast } = useToast();

  // Đồng bộ time limit một lần cho bộ nháp từ Studio.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const mins = await resolveTimeLimitMinutes(draft);
      if (cancelled || mins === (draft.timeLimitMinutes ?? null)) return;
      onDraftChange((prev) => (prev ? { ...prev, timeLimitMinutes: mins } : prev));
    })();
    return () => {
      cancelled = true;
    };
    // Chỉ chạy lại khi đổi bộ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  const session: GenerationSession = useMemo(
    () => ({
      id: draft.id,
      jobTitle: draft.jobTitle,
      jdContent: draft.jobDescription,
      hrOwner: "",
      status: "COMPLETED",
      createdAt: draft.generatedAt || new Date().toISOString(),
      updatedAt: draft.generatedAt || new Date().toISOString(),
      generatedQuestions: draft.questions,
      questionSetId: draft.id,
      isFromStudio: true,
    }),
    [draft.id, draft.jobTitle, draft.jobDescription, draft.generatedAt, draft.questions]
  );

  return (
    <ReviewPageClient
      session={session}
      draftQuestions={draft.questions}
      questionSetId={draft.id}
      jobDescription={draft.jobDescription}
      jdSourceType={draft.jdSourceType}
      jdOriginalFileName={draft.jdOriginalFileName}
      sourceProjectId={draft.sourceProjectId}
      onJobDescriptionChange={(next) => {
        onDraftChange((prev) =>
          prev
            ? {
                ...prev,
                jobDescription: next.content ?? undefined,
                jdSourceType: next.sourceType ?? prev.jdSourceType,
                jdOriginalFileName:
                  next.sourceType === "UploadedFile"
                    ? next.fileName ?? prev.jdOriginalFileName
                    : null,
              }
            : prev
        );
      }}
      publishStatus={draft.status}
      onPublishStatusChange={onPublishStatusChange}
      initialTimeLimitMinutes={draft.timeLimitMinutes}
      initialAutoRecommendEnabled={draft.autoRecommendEnabled ?? true}
      initialRecommendationMinScore={draft.recommendationMinScore ?? 70}
      initialIsHiringAssessment={draft.isHiringAssessment ?? false}
      initialHrAntiCheatEnabled={draft.hrAntiCheatEnabled ?? false}
      initialPublicJobDescription={draft.publicJobDescription ?? null}
      initialHiringPosting={{
        jobLocation: draft.jobLocation,
        workplaceType: draft.workplaceType,
        salaryMin: draft.salaryMin,
        salaryMax: draft.salaryMax,
        salaryNegotiable: draft.salaryNegotiable,
        jobExpertise: draft.jobExpertise,
        jobDomain: draft.jobDomain,
      }}
      jdFileUrl={draft.jdFileUrl ?? null}
      onRenameTitle={async (title) => {
        try {
          const savedTitle = await renameQuestionSetTitle(draft.id, title);
          onDraftChange((prev) => (prev ? { ...prev, jobTitle: savedTitle } : prev));
          addToast("success", t.reviewPage.renameSuccess);
          return true;
        } catch (err) {
          addToast(
            "error",
            err instanceof Error && err.message ? err.message : t.reviewPage.renameFailed
          );
          return false;
        }
      }}
    />
  );
}
