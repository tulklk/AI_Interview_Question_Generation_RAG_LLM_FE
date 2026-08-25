"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Clock, Crown, Code2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate, type CoachRecommendation } from "@/features/candidate/utils/dashboard-analytics";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useCandidateSubscription } from "@/features/candidate/context/candidate-subscription-context";
import { UpgradeModal } from "@/features/candidate/components/billing/upgrade-modal";
import { getCoachPlan, type CoachPlanItem } from "@/features/candidate/services/coach.service";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";

const PRIORITY_COLOR: Record<CoachRecommendation["priority"], { bg: string; text: string; dot: string }> = {
  high:   { bg: "bg-red-50 dark:bg-red-950/40",    text: "text-red-600 dark:text-red-400",    dot: "bg-red-500" },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  low:    { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
};

/** Capitalize the first letter of a skill name, keep the rest as-is (e.g. "c#" → "C#", "javascript" → "Javascript"). */
function capitalizeSkill(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Skill row: icon + name + score progress bar */
function SkillRow({ item, index }: { item: CoachPlanItem; index: number }) {
  const si = getSkillIcon(item.skill);
  const SIcon = si?.icon ?? Code2;
  const iconClass = si?.className ?? "text-gray-500 dark:text-gray-400";
  const name = capitalizeSkill(item.skill);
  const score = item.currentScore ?? 0;
  const target = item.targetScore ?? 70;
  const pct = Math.min(Math.round((score / target) * 100), 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="flex items-center gap-3"
    >
      {/* Icon bubble */}
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/50 flex items-center justify-center shrink-0">
        <SIcon size={15} className={iconClass} />
      </div>

      {/* Name + progress */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className={cn("text-[12.5px] font-semibold truncate", portalHeadingAlt)}>{name}</span>
          <span className={cn("text-[11px] tabular-nums shrink-0", portalSubtextAlt)}>
            {Math.round(score)}<span className="opacity-50">/{target}</span>
          </span>
        </div>
        <div className="w-full h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, delay: 0.1 + index * 0.06, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

interface AiCoachPanelProps {
  recommendations: CoachRecommendation[];
  loading: boolean;
}

export function AiCoachPanel({ recommendations, loading }: AiCoachPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerDashboardPage.coach;
  const { planType } = useCandidateSubscription();
  const isPremium = planType === "PREMIUM";
  const [items, setItems] = useState<CoachPlanItem[] | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    getCoachPlan()
      .then((plan) => setItems(plan?.items ?? []))
      .catch(() => setItems([]));
  }, [isPremium]);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-2.5">
            <Skeleton className="h-3 w-24" />
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1 w-full rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const incomplete = (items ?? []).filter((i) => i.status !== "done").slice(0, 4);

  return (
    <div className="flex flex-col gap-3">

      {/* ── Free tier: upgrade prompt ── */}
      {!isPremium && (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 p-4">
          <p className={cn("text-[13px] leading-[19px] mb-3", portalHeadingAlt)}>{p.upgradeHint}</p>
          <button
            type="button"
            onClick={() => setUpgradeOpen(true)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            <Crown size={12} />
            {p.openCoach}
            <ChevronRight size={12} />
          </button>
        </div>
      )}

      {/* ── Premium: skill plan ── */}
      {isPremium && items && incomplete.length > 0 && (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20 p-4">
          <p className={cn("text-[10.5px] font-bold uppercase tracking-wider mb-3", portalSubtextAlt)}>
            {p.planSkillsTitle}
          </p>
          <div className="flex flex-col gap-3">
            {incomplete.map((item, idx) => (
              <SkillRow key={item.id} item={item} index={idx} />
            ))}
          </div>
          <Link
            href="/candidate/coach"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-hover transition-colors mt-4"
          >
            {p.openCoach}
            <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {/* ── Premium: all done or no plan ── */}
      {isPremium && items && incomplete.length === 0 && (
        <Link
          href="/candidate/coach"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-hover"
        >
          {items.length === 0 ? p.startDiagnostic : p.openCoach}
          <ChevronRight size={12} />
        </Link>
      )}

      {/* ── AI recommendations ── */}
      {recommendations.map((rec) => {
        const col = PRIORITY_COLOR[rec.priority];
        return (
          <div
            key={rec.id}
            className={cn(
              "rounded-xl border border-gray-100 dark:border-gray-800 p-4",
              "bg-gray-50/40 dark:bg-gray-800/20",
            )}
          >
            {/* Priority badge + time */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className={cn("inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full", col.bg, col.text)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", col.dot)} />
                {p.priorityLabels[rec.priority]}
              </span>
              <span className={cn("flex items-center gap-1 text-[11px]", portalSubtextAlt)}>
                <Clock size={10} />
                {fillTemplate(p.estimatedMinutes, { minutes: String(rec.estimatedMinutes) })}
              </span>
            </div>

            {/* Evidence */}
            <p className={cn("text-[13px] leading-4.75 mb-1.5 font-medium", portalHeadingAlt)}>
              {fillTemplate((p.evidence as Record<string, string>)[rec.evidenceKey] ?? "", rec.tokens)}
            </p>

            {/* Action */}
            <p className={cn("text-[12px] leading-4.5 mb-3", portalSubtextAlt)}>
              {fillTemplate((p.action as Record<string, string>)[rec.actionKey] ?? "", rec.tokens)}
            </p>

            {/* CTA */}
            <Link
              href={rec.ctaHref}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              {p.ctaLabel}
              <ChevronRight size={12} />
            </Link>
          </div>
        );
      })}

      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}
    </div>
  );
}
