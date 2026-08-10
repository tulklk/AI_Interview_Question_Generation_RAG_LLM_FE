"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw, SearchX, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { SetDetail } from "./set-detail";
import { getQuestionSetById, NotFoundError } from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtextAlt, portalHeadingAlt } from "@/shared/utils/portal-ui";

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

  return (
    <JobseekerAppShell
      pageTitle={set?.title ?? p.loading}
      breadcrumb={[
        { label: "Jobseeker", href: "/jobseeker/dashboard" },
        { label: "Sets", href: "/jobseeker/practice" },
        { label: set?.title ?? "" },
      ]}
    >
      {loading && (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <AiLoadingSpinner text={p.loading} />
        </div>
      )}

      {/* Set not found — friendly in-app message */}
      {!loading && isNotFound && (
        <div className="flex flex-col items-center gap-4 py-24 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <SearchX size={28} className="text-gray-400 dark:text-gray-500" />
          </div>
          <div>
            <p className={cn("text-[17px] font-[700] mb-1", portalHeadingAlt)}>
              {p.notFoundTitle}
            </p>
            <p className={cn("text-[13px] max-w-xs", portalSubtextAlt)}>
              {p.notFoundSubtext}
            </p>
          </div>
          <Link
            href="/jobseeker/sets"
            className="flex items-center gap-2 h-9 px-4 text-[13px] font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft size={14} />
            {p.backToSetsBtn}
          </Link>
        </div>
      )}

      {/* General load error */}
      {!loading && !isNotFound && error && (
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

      {!loading && !error && !isNotFound && set && <SetDetail set={set} />}
    </JobseekerAppShell>
  );
}
