"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

/** Nav + content pane — shared HR/admin settings Suspense fallback. */
export function SettingsLayoutSkeleton() {
  return (
    <div className="flex flex-col items-start gap-4 md:grid md:grid-cols-[220px_1fr] md:gap-6" aria-busy>
      <div className="hr-glass-card w-full space-y-1 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
            <Skeleton className="hidden h-3.5 flex-1 md:block" />
          </div>
        ))}
      </div>
      <div className="hr-glass-card w-full space-y-4 p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-64" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-2/3 rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ProfileSectionSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-28 rounded-lg" />
    </div>
  );
}

export function HrBillingPlansSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="hr-glass-card space-y-3 p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[80%]" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="mt-2 h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}
