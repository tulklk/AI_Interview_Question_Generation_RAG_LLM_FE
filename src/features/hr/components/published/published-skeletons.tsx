"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

export function PublishedInsightsTableSkeleton() {
  return (
    <div className="hr-glass-card overflow-hidden" aria-busy>
      <div className="hidden border-b border-gray-100 px-4 py-2.5 dark:border-gray-800 md:grid md:grid-cols-[1fr_90px_90px_100px_110px] md:gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-3 w-16" />
      </div>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3.5 last:border-b-0 dark:border-gray-800 md:grid md:grid-cols-[1fr_90px_90px_100px_110px] md:items-center md:gap-3"
        >
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-[70%]" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function PublishedSetHubSkeleton() {
  return (
    <div className="space-y-5" aria-busy>
      <div className="hr-glass-card space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-[70%] max-w-md" />
            <Skeleton className="h-3 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 border-b border-gray-100 pb-2 dark:border-gray-800">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="hr-glass-card space-y-3 p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Khung chờ cho tab Thống kê — cùng bố cục: KPI, bục top 1-2-3, lịch sử gần đây. */
export function PublishedHubInsightsSkeleton() {
  const podium = [
    { avatar: "h-12 w-12", block: "h-16 sm:h-20" },
    { avatar: "h-16 w-16", block: "h-24 sm:h-28" },
    { avatar: "h-12 w-12", block: "h-12 sm:h-14" },
  ];
  return (
    <div className="space-y-5" aria-busy>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-7 w-36 rounded-full" />
        <Skeleton className="h-8 w-44 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-7 w-14" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 p-5 dark:border-gray-800 lg:col-span-2">
          <Skeleton className="h-5 w-44" />
          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 items-end gap-2 sm:gap-4">
            {podium.map((slot, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className={`${slot.avatar} rounded-full`} />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-14" />
                <Skeleton className={`${slot.block} mt-1 w-full rounded-b-none rounded-t-xl`} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-gray-100 p-5 dark:border-gray-800">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PublishedHubFeedbackSkeleton() {
  return (
    <div className="space-y-3 py-4" aria-busy>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-5 w-12 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
