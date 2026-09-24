"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function FeedbackResultPageSkeleton() {
  return (
    <div className="space-y-6 pb-10" aria-busy>
      <div className="hr-glass-card flex flex-col items-center gap-5 rounded-2xl p-5 sm:flex-row sm:items-start sm:gap-10 sm:p-8">
        <Skeleton className="h-28 w-28 shrink-0 rounded-full" />
        <div className="w-full flex-1 space-y-3 text-center sm:text-left">
          <Skeleton className="mx-auto h-4 w-32 sm:mx-0" />
          <Skeleton className="mx-auto h-8 w-48 sm:mx-0" />
          <Skeleton className="mx-auto h-6 w-24 rounded-full sm:mx-0" />
          <Skeleton className="h-3 w-full max-w-md" />
          <Skeleton className="h-3 w-2/3 max-w-sm" />
        </div>
      </div>

      <div className="hr-glass-card space-y-3 rounded-2xl p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[92%]" />
        <Skeleton className="h-3 w-[85%]" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-gray-200/90 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/80"
          >
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-10 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
