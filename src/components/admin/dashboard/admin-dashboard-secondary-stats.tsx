"use client";

import { useLanguage } from "@/context/language-context";

export function AdminDashboardSecondaryStats() {
  const { t } = useLanguage();
  const s = t.adminPages.dashboard.secondaryStats;

  return (
    <section className="mt-6 animate-fade-up" style={{ animationDelay: "40ms" }}>
      <div className="mb-4">
        <h2 className="text-lg font-bold leading-tight text-[#111827]">{s.title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#6b7280]">{s.subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {s.cards.map((card, i) => (
          <div
            key={`${card.label}-${i}`}
            className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] animate-fade-up"
            style={{ animationDelay: `${60 + i * 50}ms` }}
          >
            <p className="text-[26px] font-bold leading-none text-[#111827]">{card.value}</p>
            <p className="mt-2 text-sm font-semibold text-[#111827]">{card.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-[#6b7280]">{card.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
