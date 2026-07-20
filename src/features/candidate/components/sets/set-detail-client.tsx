"use client";

import { useEffect, useState } from "react";
import { useParams, notFound } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { SetDetail } from "./set-detail";
import { getQuestionSetById, NotFoundError } from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtextAlt } from "@/shared/utils/portal-ui";

export function SetDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage;

  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    setIsNotFound(false);

    getQuestionSetById(id)
      .then((res) => {
        if (!cancelled) setSet(res);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof NotFoundError) setIsNotFound(true);
        else setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  if (isNotFound) notFound();

  return (
    <JobseekerAppShell
      pageTitle={set?.title ?? p.loading}
      breadcrumb={[
        { label: "Jobseeker", href: "/jobseeker" },
        { label: "Sets", href: "/jobseeker" },
        { label: set?.title ?? "" },
      ]}
    >
      {loading && (
        <div className="py-20 flex items-center justify-center">
          <AiLoadingSpinner text={p.loading} />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtextAlt)}>{p.loadFailed}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
          >
            <RefreshCw size={13} />
            {p.retryBtn}
          </button>
        </div>
      )}

      {!loading && !error && set && <SetDetail set={set} />}
    </JobseekerAppShell>
  );
}
