"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

/** Mirrors SetDetail: back link + compact gradient hero + body grid. */
export function SetDetailPageSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="mb-5 h-4 w-36" />

      <div className="relative mb-5 overflow-hidden rounded-[20px] border border-violet-100 bg-gradient-to-br from-white to-violet-50/40 dark:border-violet-900/30 dark:from-gray-950 dark:to-indigo-950/40">
        <div className="relative px-5 pb-4 pt-3.5 md:px-6 md:pt-4">
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>

          <div className="mb-2 flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <Skeleton className="h-3 w-24" />
          </div>

          <Skeleton className="mb-2.5 h-7 w-[85%] max-w-lg sm:h-8" />

          <div className="mb-2.5 flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_304px]">
        <div className="hr-glass-card overflow-hidden">
          <div className="space-y-1.5 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <div className="space-y-0 px-5 py-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 py-3 ${i > 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}
              >
                <Skeleton className="mt-0.5 h-3 w-4 shrink-0" />
                <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-full max-w-xs" />
                  <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hr-glass-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <Skeleton className="h-3.5 w-1.5 rounded-full" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <div className="flex flex-col items-center gap-4 px-5 py-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
              <div className="space-y-1 bg-white p-3 dark:bg-gray-900/80">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-2.5 w-14" />
              </div>
              <div className="space-y-1 bg-white p-3 dark:bg-gray-900/80">
                <Skeleton className="h-4 w-10" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
