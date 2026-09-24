"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

/** Full-page placeholder while coach context/report/roadmaps hydrate. */
export function CoachPageSkeleton() {
  return (
    <div className="space-y-3 pb-10" aria-busy="true" aria-label="Loading">
      {/* Hero */}
      <div className="rounded-xl border border-gray-200/90 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950/80 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-7 w-40 sm:w-48" />
            <Skeleton className="h-3.5 w-full max-w-md" />
          </div>
          <Skeleton className="h-9 w-36 shrink-0 rounded-lg" />
        </div>
      </div>

      {/* Steps */}
      <div className="hr-glass-card px-3 py-3 sm:px-4">
        <Skeleton className="mb-3 h-3 w-28" />
        <div className="flex items-center justify-between gap-1 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-2.5 w-10 sm:w-14" />
            </div>
          ))}
        </div>
        <Skeleton className="mt-3 h-1 w-full rounded-full" />
        <Skeleton className="mt-2 h-3 w-3/4 max-w-sm" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.55fr)]">
        {/* Main column — roadmap-like card */}
        <div className="min-w-0 space-y-3">
          <div className="hr-glass-card overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-2.5 w-52" />
              </div>
            </div>
            <div className="space-y-3 px-5 py-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-1 w-full rounded-full" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              </div>
              <div className="space-y-2 sm:ml-11">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[90%]" />
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800"
                  >
                    <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-16 rounded-full" />
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-2.5 w-28" />
                    </div>
                    <Skeleton className="h-7 w-16 shrink-0 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Aside */}
        <aside className="space-y-2.5 self-start">
          <div className="hr-glass-card space-y-3 overflow-hidden px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex items-center gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
              <Skeleton className="h-13 w-13 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            </div>
          </div>

          <div className="hr-glass-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="space-y-0">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 border-b border-gray-100 px-3 py-3 last:border-0 dark:border-gray-800"
                >
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
