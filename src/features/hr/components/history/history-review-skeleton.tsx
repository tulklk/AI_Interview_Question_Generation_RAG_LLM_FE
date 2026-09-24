"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function HistoryReviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      <div className="hr-glass-card space-y-4 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0 dark:border-gray-800">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-8 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
