"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function HrCandidateOverviewSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="hr-glass-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-56" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-14 w-16 rounded-xl" />
            <Skeleton className="h-14 w-16 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="hr-glass-card space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-[70%]" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div className="hr-glass-card space-y-3 p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function HrCandidatePracticePanelSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-[60%]" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}
