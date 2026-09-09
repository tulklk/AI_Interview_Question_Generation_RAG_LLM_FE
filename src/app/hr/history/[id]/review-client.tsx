"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { AppShell } from "@/features/hr/components/layout/app-shell";
import { ReviewPageClient } from "@/features/question/components/review-page-client";
import {
  getDraft,
  renameQuestionSetTitle,
} from "@/features/interview/services/interview.service";
import type { DraftQuestionSet, GenerationSession } from "@/features/interview/types/generation-session";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { useToast } from "@/shared/providers/toast-context";

/**
 * SCRUM-391: /hr/history/[id] với id = questionSetId (không còn V1 jobId).
 */
export function HrReviewPageClient() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { t } = useLanguage();
  const { addToast } = useToast();
  const router = useRouter();

  const [draft, setDraft] = useState<DraftQuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [publishStatus, setPublishStatus] = useState<"DRAFT" | "PUBLISHED" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      const d = await getDraft(id);
      if (cancelled) return;
      if (!d) {
        setNotFound(true);
        setDraft(null);
      } else {
        setDraft(d);
        setPublishStatus(d.status);
        setNotFound(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <AppShell pageTitle={t.historyPage.heading}>
        <div className="flex justify-center py-20">
          <AiLoadingSpinner />
        </div>
      </AppShell>
    );
  }

  if (notFound || !draft) {
    return (
      <AppShell pageTitle={t.historyPage.heading}>
        <div className="mx-auto max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h2 className={cn("text-base font-semibold", portalHeading)}>
                {t.historyPage.detailNotFoundTitle}
              </h2>
              <p className={cn("mt-1 text-sm", portalSubtext)}>
                {t.historyPage.detailNotFoundBody}
              </p>
              <button
                type="button"
                onClick={() => router.push("/hr/history")}
                className="mt-4 text-sm font-semibold text-primary hover:underline"
              >
                {t.historyPage.backToHistory}
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const session: GenerationSession = {
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
  };

  return (
    <AppShell pageTitle={draft.jobTitle || t.historyPage.heading} fullWidth>
      <ReviewPageClient
        session={session}
        draftQuestions={draft.questions}
        questionSetId={draft.id}
        jobDescription={draft.jobDescription}
        jdSourceType={draft.jdSourceType}
        jdOriginalFileName={draft.jdOriginalFileName}
        sourceProjectId={draft.sourceProjectId}
        onJobDescriptionChange={(next) => {
          setDraft((prev) =>
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
        publishStatus={publishStatus}
        onPublishStatusChange={setPublishStatus}
        initialTimeLimitMinutes={draft.timeLimitMinutes}
        initialAutoRecommendEnabled={draft.autoRecommendEnabled ?? true}
        initialRecommendationMinScore={draft.recommendationMinScore ?? 70}
        onRenameTitle={async (title) => {
          try {
            const savedTitle = await renameQuestionSetTitle(draft.id, title);
            setDraft((prev) => (prev ? { ...prev, jobTitle: savedTitle } : prev));
            addToast("success", t.reviewPage.renameSuccess ?? "Đã đổi tên.");
            return true;
          } catch (err) {
            addToast(
              "error",
              err instanceof Error && err.message
                ? err.message
                : (t.reviewPage.renameFailed ?? "Không đổi được tên.")
            );
            return false;
          }
        }}
      />
    </AppShell>
  );
}
