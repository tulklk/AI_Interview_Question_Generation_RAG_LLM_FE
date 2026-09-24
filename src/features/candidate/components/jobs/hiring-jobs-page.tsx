"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import { getQuestionSetById } from "@/features/candidate/services/question-set.service";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { HiringJobCard, HiringJobsEmptyIcon } from "@/features/candidate/components/jobs/hiring-job-card";
import { HiringJobDetail } from "@/features/candidate/components/jobs/hiring-job-detail";
import { HiringJobFilterBar } from "@/features/candidate/components/jobs/hiring-job-filter-bar";
import {
  EMPTY_HIRING_FILTERS,
  LIST_PAGE_SIZE,
  applyHiringFilters,
  buildFacets,
  filtersToSearchParams,
  hasActiveFilters,
  loadHiringCatalog,
  parseFiltersFromSearchParams,
  type HiringJobFilters,
} from "@/features/candidate/components/jobs/hiring-job-filters";
import {
  detailVariants,
  fadeUp,
  listItemVariants,
  motionSafe,
  staggerContainer,
  staggerItem,
} from "@/features/candidate/components/jobs/hiring-jobs-motion";
import {
  HiringJobCardSkeleton,
  HiringJobDetailSkeleton,
} from "@/features/candidate/components/jobs/hiring-job-skeletons";
import { EmptyState } from "@/features/candidate/components/ui/empty-state";
import { portalHeadingAlt, portalInput, portalSubtextAlt } from "@/shared/utils/portal-ui";

function getPageNums(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  const nums: (number | "…")[] = [1];
  if (left > 2) nums.push("…");
  for (let i = left; i <= right; i++) nums.push(i);
  if (right < total - 1) nums.push("…");
  nums.push(total);
  return nums;
}

const pageBtnIdle = cn(
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border text-[13px] font-semibold transition-colors",
  "border-gray-200 bg-white hover:border-primary hover:text-primary",
  "dark:border-gray-700 dark:bg-gray-900",
  "disabled:cursor-not-allowed disabled:opacity-40"
);

/**
 * SCRUM-467 / SCRUM-468: danh sách bộ Tuyển — desktop split (list + JD), mobile navigate.
 * Filters: FE catalog (cap 200) — BE list API lacks workplace/salary/expertise params.
 */
export function HiringJobsPage() {
  const { t } = useLanguage();
  const h = t.hiringJobsPage;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const reduced = useReducedMotion();
  const safe = motionSafe(reduced);

  const parsedInitial = useMemo(() => parseFiltersFromSearchParams(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps -- mount only

  const [keyword, setKeyword] = useState(parsedInitial.keyword);
  const [debounced, setDebounced] = useState(parsedInitial.keyword);
  const [page, setPage] = useState(parsedInitial.page);
  const [filters, setFilters] = useState<HiringJobFilters>(parsedInitial.filters);

  const [catalog, setCatalog] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [detail, setDetail] = useState<QuestionSet | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const skipUrlWrite = useRef(true);

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
  }, [debounced, filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    loadHiringCatalog()
      .then((items) => {
        if (!cancelled) setCatalog(items);
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
  }, [reloadKey]);

  const facets = useMemo(() => buildFacets(catalog), [catalog]);

  const filtered = useMemo(
    () => applyHiringFilters(catalog, filters, debounced),
    [catalog, filters, debounced]
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * LIST_PAGE_SIZE;
    return filtered.slice(start, start + LIST_PAGE_SIZE);
  }, [filtered, safePage]);

  // Sync URL (preserve id)
  useEffect(() => {
    if (skipUrlWrite.current) {
      skipUrlWrite.current = false;
      return;
    }
    const sp = filtersToSearchParams(filters, debounced, safePage, selectedId);
    const next = sp.toString();
    const cur = searchParams.toString();
    if (next !== cur) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    }
  }, [filters, debounced, safePage, selectedId, pathname, router, searchParams]);

  // Desktop: auto-select first / remap when filtered out
  useEffect(() => {
    if (!isDesktop || loading || error) return;
    if (filtered.length === 0) {
      if (selectedId) {
        const sp = filtersToSearchParams(filters, debounced, safePage, null);
        router.replace(sp.toString() ? `${pathname}?${sp}` : pathname, { scroll: false });
      }
      return;
    }
    const stillVisible = selectedId && filtered.some((j) => j.id === selectedId);
    if (!stillVisible) {
      const first = filtered[0]?.id;
      if (first) {
        const sp = filtersToSearchParams(filters, debounced, safePage, first);
        router.replace(`${pathname}?${sp}`, { scroll: false });
      }
    }
  }, [isDesktop, loading, error, filtered, selectedId, filters, debounced, safePage, pathname, router]);

  // Desktop: load detail when ?id= changes
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

  function selectJob(id: string) {
    if (!isDesktop) {
      router.push(`/candidate/jobs/${id}`);
      return;
    }
    const sp = filtersToSearchParams(filters, debounced, safePage, id);
    router.replace(`${pathname}?${sp}`, { scroll: false });
  }

  function handleFiltersChange(next: HiringJobFilters) {
    setFilters(next);
  }

  const filterLabels = {
    urgent: h.filterUrgent,
    workplace: h.filterWorkplace,
    salary: h.filterSalary,
    expertise: h.filterExpertise,
    skills: h.filterSkills,
    domain: h.filterDomain,
    location: h.filterLocation,
    company: h.filterCompany,
    difficulty: h.filterDifficulty,
    duration: h.filterDuration,
    advanced: h.filterAdvanced,
    searchExpertise: h.filterSearchExpertise,
    searchSkills: h.filterSearchSkills,
    searchDomain: h.filterSearchDomain,
    searchLocation: h.filterSearchLocation,
    searchCompany: h.filterSearchCompany,
    salaryFrom: h.filterSalaryFrom,
    salaryTo: h.filterSalaryTo,
    salaryApply: h.filterSalaryApply,
    salaryReset: h.filterSalaryReset,
    numericSalaryOnly: h.filterNumericSalaryOnly,
    clearAll: h.filterClearAll,
    filtering: h.filterFiltering,
    workplaceAtOffice: h.workplaceAtOffice,
    workplaceHybrid: h.workplaceHybrid,
    workplaceRemote: h.workplaceRemote,
    difficultyEasy: h.filterDifficultyEasy,
    difficultyMedium: h.filterDifficultyMedium,
    difficultyHard: h.filterDifficultyHard,
    durationMax: h.filterDurationMax,
    durationAny: h.filterDurationAny,
    noOptions: h.filterNoOptions,
    viewResults: h.filterViewResults,
    salaryNegotiable: h.salaryNegotiable,
  };

  const emptyFromFilters = hasActiveFilters(filters) || Boolean(debounced);

  return (
    <motion.div
      className="mx-auto w-full max-w-7xl space-y-3 px-1 pb-10"
      variants={staggerContainer}
      {...safe}
    >
      <motion.header className="space-y-1" variants={staggerItem}>
        <h1 className={cn("text-2xl font-bold tracking-tight", portalHeadingAlt)}>{h.heading}</h1>
        <p className={cn("text-sm", portalSubtextAlt)}>{h.subheading}</p>
      </motion.header>

      <motion.div className="relative" variants={staggerItem}>
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={h.searchPlaceholder}
          className={cn(
            portalInput,
            "h-10 w-full rounded-xl border-gray-200 bg-white pl-10 pr-4 text-sm shadow-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15 dark:border-gray-700 dark:bg-gray-900"
          )}
        />
      </motion.div>

      {!loading && !error && (
        <motion.div variants={staggerItem}>
          <HiringJobFilterBar
            filters={filters}
            onChange={handleFiltersChange}
            facets={facets}
            labels={filterLabels}
            catalog={catalog}
            keyword={debounced}
          />
        </motion.div>
      )}

      {loading ? (
        <motion.div
          className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start"
          variants={fadeUp}
          {...safe}
        >
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <HiringJobCardSkeleton key={i} />
            ))}
          </div>
          <div className="hidden lg:block">
            <HiringJobDetailSkeleton />
          </div>
        </motion.div>
      ) : error ? (
        <motion.div
          className="flex flex-col items-center gap-3 py-16 text-center"
          variants={fadeUp}
          {...safe}
        >
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
        </motion.div>
      ) : pageItems.length === 0 ? (
        <motion.div variants={fadeUp} {...safe}>
          <EmptyState
            icon={HiringJobsEmptyIcon}
            title={emptyFromFilters ? h.emptySearchTitle : h.emptyTitle}
            subtext={
              emptyFromFilters
                ? hasActiveFilters(filters)
                  ? h.emptyFilterBody
                  : h.emptySearchBody
                : h.emptyBody
            }
            action={
              hasActiveFilters(filters) ? (
                <button
                  type="button"
                  onClick={() => setFilters({ ...EMPTY_HIRING_FILTERS })}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90"
                >
                  {h.filterClearAll}
                </button>
              ) : undefined
            }
          />
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start"
          variants={staggerItem}
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-2 px-0.5">
              <p className={cn("text-[13px] font-semibold", portalHeadingAlt)}>{h.listTitle}</p>
              <p className={cn("text-[11px] tabular-nums", portalSubtextAlt)}>
                {h.listCount.replace("{{count}}", String(total))}
              </p>
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={`page-${safePage}-${debounced}-${total}`}
                className="flex flex-col gap-2.5"
                variants={staggerContainer}
                initial={reduced ? false : "hidden"}
                animate="visible"
              >
                {pageItems.map((set) => (
                  <motion.div
                    key={set.id}
                    layout={!reduced}
                    variants={listItemVariants}
                    initial={reduced ? false : "initial"}
                    animate="animate"
                    exit="exit"
                  >
                    <HiringJobCard
                      set={set}
                      selected={isDesktop && selectedId === set.id}
                      onSelect={selectJob}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={cn(pageBtnIdle, portalHeadingAlt)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>

                {getPageNums(safePage, totalPages).map((num, i) =>
                  num === "…" ? (
                    <span
                      key={`ellipsis-${i}`}
                      className={cn("w-8 text-center text-sm select-none", portalSubtextAlt)}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setPage(num)}
                      aria-current={num === safePage ? "page" : undefined}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold transition-colors",
                        num === safePage
                          ? "bg-primary text-white shadow-sm"
                          : cn(pageBtnIdle, portalHeadingAlt)
                      )}
                    >
                      {num}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(pageBtnIdle, portalHeadingAlt)}
                  aria-label="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  detailLoading
                    ? "detail-loading"
                    : detailError
                      ? "detail-error"
                      : detail?.id ?? "detail-empty"
                }
                variants={detailVariants}
                initial={reduced ? false : "initial"}
                animate="animate"
                exit="exit"
              >
                {detailLoading ? (
                  <HiringJobDetailSkeleton />
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
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
