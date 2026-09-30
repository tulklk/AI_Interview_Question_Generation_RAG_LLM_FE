"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalCard } from "@/shared/utils/portal-ui";
import { useLeaderboardText } from "./leaderboard-text";

export function WeeklyChallengesCard() {
  const lb = useLeaderboardText();
  return (
    <section className={cn(portalCard, "p-6 shadow-sm")}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center shrink-0">
          <Trophy size={18} className="text-amber-500" />
        </div>
        <h2 className="text-base font-bold text-[#111827] dark:text-gray-100">
          {lb.challengesTitle}
        </h2>
      </div>

      {/* Explanation */}
      <div className="space-y-3 text-sm text-[#6B7280] dark:text-gray-300 leading-relaxed">
        <p>{lb.challenges[0]}</p>
        <p>{lb.challenges[1]}</p>
        <p>{lb.challenges[2]}</p>
      </div>
    </section>
  );
}
