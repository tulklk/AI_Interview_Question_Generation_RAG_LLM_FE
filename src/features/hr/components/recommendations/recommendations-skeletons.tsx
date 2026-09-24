"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function RecommendationsListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="hr-glass-card overflow-hidden" aria-busy>
      <div className="flex flex-col">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5 last:border-b-0 dark:border-gray-800"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-56" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <Skeleton className="h-8 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Toolbar + list for Suspense on /hr/candidate-recommendations. */
export function RecommendationsPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <RecommendationsListSkeleton />
    </div>
  );
}

export function RecommendationDetailSkeleton() {
  return (
    <div aria-busy>
      <Skeleton className="mb-4 h-4 w-28" />
      <div className="hr-glass-card mb-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-56" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="hr-glass-card space-y-3 p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[90%]" />
            <Skeleton className="h-3 w-[80%]" />
          </div>
          <div className="hr-glass-card space-y-3 p-5">
            <Skeleton className="h-4 w-28" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-md" />
              ))}
            </div>
          </div>
        </div>
        <div className="hr-glass-card space-y-3 p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="aspect-210/297 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function CompareRecommendationsSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-6 w-56" />
      <div className="hr-glass-card overflow-x-auto p-4">
        <div className="grid min-w-[640px] grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, col) => (
            <div key={col} className="space-y-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-4 h-20 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
