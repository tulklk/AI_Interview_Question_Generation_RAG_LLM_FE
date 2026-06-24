"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ReviewPageClient } from "@/components/results/review-page-client";
import { getGenerationSession, getGenerationJob, getJobQuestions, getDraft } from "@/lib/api/generation";
import { getLocalSession, toGenerationSession } from "@/lib/local-history";
import type { GenerationSession, DraftQuestionSet } from "@/types/generation-session";
import { cn } from "@/lib/utils";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";

function getRealId(paramId: string): string {
  if (paramId && paramId !== "placeholder") return paramId;
  if (typeof window === "undefined") return paramId;
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[segments.length - 1] || paramId;
}

export function HrReviewPageClient() {
  const params = useParams<{ id: string }>();
  const id = getRealId(params.id ?? "");
  const [session, setSession] = useState<GenerationSession | null>(null);
  const [draft, setDraft] = useState<DraftQuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || id === "placeholder") return;
    setLoading(true);

    if (id.startsWith("local-")) {
      const local = getLocalSession(id);
      if (local) setSession(toGenerationSession(local));
      else setError("Session not found.");
      setLoading(false);
      return;
    }

    getGenerationJob(id)
      .then(async (job) => {
        if (!job) {
          return getGenerationSession(id).then(setSession);
        }

        if (job.status === "COMPLETED") {
          const qs = await getJobQuestions(id);
          if (qs.length > 0) {
            job = { ...job, generatedQuestions: qs };
          }
        }

        if (job.hasDraft && job.questionSetId) {
          const d = await getDraft(job.questionSetId);
          if (d) setDraft(d);
        }

        setSession(job);
      })
      .catch(() => setError("Failed to load session."))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AppShell
      breadcrumb={[
        { label: "HR", href: "/hr/dashboard" },
        { label: "History", href: "/hr/history" },
        { label: "Review" },
      ]}
      pageTitle="Review"
    >
      {loading && (
        <div className="flex items-center justify-center py-24 gap-3">
          <Loader2 size={20} className="animate-spin text-primary" />
          <span className={cn("text-sm", portalSubtext)}>Loading session…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 max-w-lg">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className={cn("text-sm font-medium", portalHeading)}>{error}</p>
        </div>
      )}

      {!loading && !error && session && (
        <ReviewPageClient
          session={session}
          draftQuestions={draft?.questions}
          isDraftView={!!draft}
        />
      )}
    </AppShell>
  );
}
