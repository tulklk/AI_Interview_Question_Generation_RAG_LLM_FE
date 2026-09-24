"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw, SearchX, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { HiringJobDetail } from "@/features/candidate/components/jobs/hiring-job-detail";
import { HiringJobDetailSkeleton } from "@/features/candidate/components/jobs/hiring-job-skeletons";
import { getQuestionSetById, NotFoundError } from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtextAlt, portalHeadingAlt } from "@/shared/utils/portal-ui";
import { cleanTitle } from "@/features/candidate/utils/clean-title";

/**
 * SCRUM-467: load detail bộ Tuyển; redirect sang /sets nếu không phải hiring.
 */
export function HiringJobDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage;
  const h = t.hiringJobsPage;
  const router = useRouter();

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
        if (cancelled) return;
        if (!res.isHiringAssessment) {
          router.replace(`/candidate/sets/${id}`);
          return;
        }
        setSet(res);
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
  }, [id, reloadKey, router]);

  const displayTitle = set ? cleanTitle(set.title) : null;

  return (
    <JobseekerAppShell
      pageTitle={displayTitle ?? h.heading}
      breadcrumb={[
        { label: "jobseeker", href: "/candidate/dashboard" },
        { label: "jobs", href: "/candidate/jobs" },
        { label: displayTitle ?? "" },
      ]}
    >
      {loading && <HiringJobDetailSkeleton />}

      {!loading && isNotFound && (
        <div className="flex flex-col items-center gap-4 px-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
            <SearchX size={28} className="text-gray-400" />
          </div>
          <p className={cn("text-[17px] font-bold", portalHeadingAlt)}>{p.notFoundTitle}</p>
          <p className={cn("max-w-xs text-[13px]", portalSubtextAlt)}>{p.notFoundSubtext}</p>
          <Link
            href="/candidate/jobs"
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white"
          >
            <ArrowLeft size={14} />
            {h.backToJobs}
          </Link>
        </div>
      )}

      {!loading && !isNotFound && error && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle size={28} className="text-red-500" />
          <p className={cn("text-[14px]", portalSubtextAlt)}>{h.loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:underline"
          >
            <RefreshCw size={13} />
            {h.retry}
          </button>
        </div>
      )}

      {!loading && !error && !isNotFound && set && <HiringJobDetail set={set} />}
    </JobseekerAppShell>
  );
}
