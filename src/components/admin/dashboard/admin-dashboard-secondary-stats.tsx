"use client";

import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

export function AdminDashboardSecondaryStats() {
  const { t } = useLanguage();
  const s = t.adminPages.dashboard.secondaryStats;

  return (
    <section className="mt-6 animate-fade-up" style={{ animationDelay: "40ms" }}>
      <div className="mb-4">
        <h2 className={cn("text-lg font-bold leading-tight", portalHeadingAlt)}>{s.title}</h2>
        <p className={cn("mt-1 text-sm leading-6", portalSubtextAlt)}>{s.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {s.cards.map((card, i) => (
          <div
            key={`${card.label}-${i}`}
            className="hr-glass-card p-5 animate-fade-up"
            style={{ animationDelay: `${60 + i * 50}ms` }}
          >
            <p className={cn("text-[26px] font-bold leading-none", portalHeadingAlt)}>{card.value}</p>
            <p className={cn("mt-2 text-sm font-semibold", portalHeadingAlt)}>{card.label}</p>
            <p className={cn("mt-1 text-xs leading-relaxed", portalSubtextAlt)}>{card.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
