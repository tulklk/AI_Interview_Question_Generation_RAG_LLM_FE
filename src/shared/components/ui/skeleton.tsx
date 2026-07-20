import { cn } from "@/lib/cn";

/** Shared pulse-loading placeholder box — compose with width/height classes for any shape. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700", className)} />;
}
