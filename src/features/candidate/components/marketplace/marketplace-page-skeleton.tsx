"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

/** Suspense fallback for /candidate/practice marketplace. */
export function MarketplacePageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-1 pb-10" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-gray-200/90 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/80"
          >
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
