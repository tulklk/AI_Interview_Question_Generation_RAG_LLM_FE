"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AlertCircle, RefreshCw, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import {
  getQuestionSetById,
  listQuestionSets,
} from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { HiringJobCard, HiringJobsEmptyIcon } from "@/features/candidate/components/jobs/hiring-job-card";
import { HiringJobDetail } from "@/features/candidate/components/jobs/hiring-job-detail";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { AiLoadingSpinner } from "@/shared/components/common/ai-loading-spinner";
import { portalHeadingAlt, portalInput, portalSubtextAlt } from "@/shared/utils/portal-ui";

const PAGE_SIZE = 12;

/**
 * SCRUM-467 / SCRUM-468: danh sách bộ Tuyển — desktop split ITViec (list + JD), mobile navigate.
 */
export function HiringJobsPage() {
  const { t } = useLanguage();
  const h = t.hiringJobsPage;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");

  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<QuestionSet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [detail, setDetail] = useState<QuestionSet | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(keyword.trim()), 300);
    return () => clearTimeout(tmr);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    listQuestionSets({
      keyword: debounced || undefined,
      page,
      pageSize: PAGE_SIZE,
      sortBy: "newest",
      isHiringAssessment: true,
    })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.totalCount);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, page, reloadKey]);

  // Desktop: auto-select first item khi chưa có ?id=
  useEffect(() => {
    if (!isDesktop || loading || error || items.length === 0) return;
    if (selectedId) return;
    const first = items[0]?.id;
    if (first) {
      router.replace(`${pathname}?id=${first}`, { scroll: false });
    }
  }, [isDesktop, loading, error, items, selectedId, pathname, router]);

  // Desktop: load detail khi ?id= đổi
  useEffect(() => {
    if (!isDesktop || !selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(false);
    getQuestionSetById(selectedId)
      .then((res) => {
        if (cancelled) return;
        if (!res.isHiringAssessment) {
          setDetail(null);
          setDetailError(true);
          return;
        }
        setDetail(res);
      })
      .catch(() => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDesktop, selectedId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function selectJob(id: string) {
    if (!isDesktop) {
      router.push(`/candidate/jobs/${id}`);
      return;
    }
    router.replace(`${pathname}?id=${id}`, { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-1 pb-10">
      <header className="space-y-1">
        <h1 className={cn("text-xl font-bold tracking-tight sm:text-2xl", portalHeadingAlt)}>
          {h.heading}
        </h1>
        <p className={cn("text-sm", portalSubtextAlt)}>{h.subheading}</p>
      </header>

      <div className="relative max-w-xl">
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={h.searchPlaceholder}
          className={cn(portalInput, "h-11 w-full rounded-xl pl-10 pr-4 text-sm")}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <AiLoadingSpinner />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="text-rose-500" size={28} />
          <p className={cn("text-sm", portalSubtextAlt)}>{h.loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90"
          >
            <RefreshCw size={13} />
            {h.retry}
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={HiringJobsEmptyIcon} title={h.emptyTitle} subtext={h.emptyBody} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
          {/* ── Left: job cards ───────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            {items.map((set) => (
              <HiringJobCard
                key={set.id}
                set={set}
                selected={isDesktop && selectedId === set.id}
                onSelect={selectJob}
              />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                >
                  ←
                </button>
                <span className={cn("text-xs tabular-nums", portalSubtextAlt)}>
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                >
                  →
                </button>
              </div>
            )}
          </div>

          {/* ── Right: detail panel (desktop only) ────────────────────── */}
          <div className="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            {detailLoading ? (
              <div className="flex justify-center py-20">
                <AiLoadingSpinner />
              </div>
            ) : detailError ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
                <AlertCircle className="text-rose-500" size={24} />
                <p className={cn("text-sm", portalSubtextAlt)}>{h.loadError}</p>
              </div>
            ) : detail ? (
              <HiringJobDetail set={detail} variant="panel" />
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 py-24 dark:border-gray-700">
                <p className={cn("text-sm", portalSubtextAlt)}>{h.selectJobHint}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
