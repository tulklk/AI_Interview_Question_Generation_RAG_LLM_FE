"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function CoachRoadmapDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="h-4 w-36" />

      <div className="hr-glass-card space-y-3 px-5 py-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
        <Skeleton className="h-3 w-52" />
      </div>

      <div className="hr-glass-card space-y-3 px-5 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-[70%]" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-7 w-16 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
