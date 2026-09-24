"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function HrTalentListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="hr-glass-card overflow-hidden" aria-busy>
      <div className="flex flex-col">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5 last:border-b-0 dark:border-gray-800"
          >
            <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-2.5 w-56" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
