"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

/** Document/folder list area inside knowledge page. */
export function KnowledgeListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 dark:border-gray-800"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-[55%]" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-7 w-7 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}
