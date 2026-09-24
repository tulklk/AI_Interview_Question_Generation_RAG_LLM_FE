"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

/** Filters + table rows for /hr/history. */
export function QuestionSetHistoryTableSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full rounded-lg sm:w-72" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="hr-glass-card overflow-hidden">
        <div className="hidden border-b border-gray-100 px-4 py-2.5 dark:border-gray-800 md:grid md:grid-cols-[1fr_100px_90px_110px_120px] md:gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3.5 last:border-b-0 dark:border-gray-800 md:grid md:grid-cols-[1fr_100px_90px_110px_120px] md:items-center md:gap-3"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-[75%]" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full history page body (heading + CTA + table) for Suspense. */
export function HistoryPageSkeleton() {
  return (
    <div aria-busy>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <QuestionSetHistoryTableSkeleton />
    </div>
  );
}
