"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function SettingsPageSkeleton() {
  return (
    <div className="flex flex-col items-start gap-4 md:grid md:grid-cols-[220px_1fr] md:gap-6" aria-busy>
      <div className="hr-glass-card w-full space-y-1 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
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
