"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

type Row = {
  label: string;
  value: ReactNode;
};

type Props = {
  title: string;
  rows: Row[];
  className?: string;
};

/** Compact read-only summary for the question-set sidebar. */
export function QuestionSetInfoCard({ title, rows, className }: Props) {
  return (
    <section className={cn(portalCard, "p-4", className)}>
      <h3 className={cn("text-sm font-semibold mb-3", portalHeading)}>{title}</h3>
      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3">
            <dt className={cn("text-xs shrink-0", portalSubtext)}>{row.label}</dt>
            <dd className={cn("text-xs font-semibold text-right min-w-0 break-words", portalHeading)}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
