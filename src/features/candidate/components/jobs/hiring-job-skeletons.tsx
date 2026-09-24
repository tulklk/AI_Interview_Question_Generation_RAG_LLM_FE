"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function HiringJobCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-900/80">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-4 w-[80%]" />
      <div className="mt-2 flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-md" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="mt-2 h-3.5 w-20" />
      <Skeleton className="mt-2 h-3 w-full" />
      <div className="mt-2 flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-14 rounded-md" />
        <Skeleton className="h-5 w-10 rounded-md" />
      </div>
    </div>
  );
}

export function HiringJobDetailSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200/90 bg-white p-5 dark:border-gray-700 dark:bg-gray-900/80">
      <div className="flex gap-4">
        <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-6 w-[75%]" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-11 w-44 rounded-xl" />
        <Skeleton className="h-11 w-11 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-3 w-2/3" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-5 space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Skeleton className="h-3 w-16" />
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[95%]" />
        <Skeleton className="h-3 w-[88%]" />
      </div>
    </div>
  );
}

/** Full jobs page placeholder (Suspense / initial). */
export function HiringJobsPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-3 px-1 pb-10" aria-busy>
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-72" />
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <HiringJobCardSkeleton key={i} />
          ))}
        </div>
        <div className="hidden lg:block">
          <HiringJobDetailSkeleton />
        </div>
      </div>
    </div>
  );
}
