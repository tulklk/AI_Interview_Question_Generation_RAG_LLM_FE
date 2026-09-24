"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function HrSessionFeedbackSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <Skeleton className="h-4 w-24" />
      <div className="hr-glass-card space-y-3 p-5 sm:p-6">
        <Skeleton className="h-3 w-28" />
        <div className="flex flex-wrap items-end gap-3">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-3 w-full max-w-md" />
      </div>
      <div className="hr-glass-card space-y-3 p-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[92%]" />
        <Skeleton className="h-3 w-[80%]" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="hr-glass-card flex gap-3 p-4">
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
