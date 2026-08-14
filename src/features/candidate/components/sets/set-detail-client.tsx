"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, RefreshCw, SearchX, ArrowLeft, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { SetDetail } from "./set-detail";
import { getQuestionSetById, NotFoundError } from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { useLanguage } from "@/shared/providers/language-context";
import { portalSubtextAlt, portalHeadingAlt } from "@/shared/utils/portal-ui";

/** How often (ms) to re-check if the set is still published while on this page. */
const PUBLISH_POLL_INTERVAL_MS = 30_000;

export function SetDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage;
  const router = useRouter();

  const [set, setSet] = useState<QuestionSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Dialog shown when HR unpublishes while the candidate is viewing
  const [unpublishedDialogOpen, setUnpublishedDialogOpen] = useState(false);

  // Ref so the polling cleanup always cancels the right timer
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ──────────────────────────────────────────────────────────
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

  // ── Background publish-status polling ────────────────────────────────────
  // Starts once the set has been loaded successfully. Re-checks every
  // PUBLISH_POLL_INTERVAL_MS. If the endpoint returns 404 (set unpublished /
  // deleted), show the "recruiter hid this set" dialog.
  useEffect(() => {
    // Only poll when the set is loaded and visible
    if (!id || !set || unpublishedDialogOpen) return;

    let cancelled = false;

    function schedule() {
      pollTimerRef.current = setTimeout(async () => {
        if (cancelled) return;
        try {
          await getQuestionSetById(id);
          // Still published — schedule next check
          if (!cancelled) schedule();
        } catch (err) {
          if (cancelled) return;
          if (err instanceof NotFoundError) {
            // Set was unpublished or deleted
            setUnpublishedDialogOpen(true);
          } else {
            // Network hiccup — retry next interval silently
            schedule();
          }
        }
      }, PUBLISH_POLL_INTERVAL_MS);
    }

    schedule();

    return () => {
      cancelled = true;
      if (pollTimerRef.current !== null) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [id, set, unpublishedDialogOpen]);

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
            href="/jobseeker/practice"
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

      {/* ── "Recruiter hid this set" dialog ────────────────────────────────── */}
      {unpublishedDialogOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Card */}
          <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900 text-center">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
              <EyeOff size={26} className="text-amber-500 dark:text-amber-400" />
            </div>

            <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-2">
              {p.unpublishedDialogTitle}
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {p.unpublishedDialogBody}
            </p>

            <button
              type="button"
              onClick={() => router.push("/jobseeker/practice")}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft size={14} />
              {p.unpublishedDialogBtn}
            </button>
          </div>
        </div>
      )}
    </JobseekerAppShell>
  );
}
