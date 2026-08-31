"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Settings2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import {
  ROADMAP_SUMMARY,
  PHASES,
  SKILLS,
  WEEKLY_PLAN,
  RECOMMENDED_PRACTICES,
  MILESTONES,
  NEXT_ACTION,
  COACH_INSIGHT,
} from "@/features/candidate/data/roadmap-dummy";
import { RoadmapOverview } from "./roadmap-overview";
import { NextActionCard } from "./next-action-card";
import { RoadmapTimeline } from "./roadmap-timeline";
import { SkillGapCard } from "./skill-gap-card";
import { MilestoneCard } from "./milestone-card";
import { CoachInsightCard } from "./coach-insight-card";
import { WeeklyPlanCard } from "./weekly-plan-card";
import { PracticeRecommendations } from "./practice-recommendations";

// ── Adjust Goal Modal (dummy) ─────────────────────────────────────────────────

function AdjustGoalModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-goal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl p-6">
        <h2
          id="adjust-goal-title"
          className={cn("text-[17px] font-[800] mb-1", portalHeadingAlt)}
        >
          Điều chỉnh mục tiêu
        </h2>
        <p className={cn("text-[13px] mb-5", portalSubtextAlt)}>
          Tính năng này sẽ sớm ra mắt. AI sẽ tự động cập nhật lộ trình phù hợp
          với vị trí và cấp độ mới của bạn.
        </p>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/15 mb-5">
          <span className="text-[12px] text-primary font-semibold">
            Vị trí hiện tại: {ROADMAP_SUMMARY.targetRole} ({ROADMAP_SUMMARY.currentLevel} → {ROADMAP_SUMMARY.targetLevel})
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-primary text-white text-[13px] font-[700] hover:bg-primary-hover transition-colors min-h-[44px]"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CandidateRoadmapPage() {
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  return (
    <div>
      {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 mb-4" aria-label="Breadcrumb">
        <Link
          href="/candidate/dashboard"
          className={cn("text-[12px] hover:text-primary transition-colors", portalSubtextAlt)}
        >
          Ứng viên
        </Link>
        <ChevronRight size={12} className="text-gray-400" aria-hidden="true" />
        <span className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
          Lộ trình
        </span>
      </nav>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className={cn("text-[22px] font-[800] leading-tight", portalHeadingAlt)}>
            Lộ trình phát triển của bạn
          </h1>
          <p className={cn("text-[13px] mt-1 max-w-lg leading-[19px]", portalSubtextAlt)}>
            Lộ trình cá nhân hóa giúp bạn nâng cao kỹ năng và sẵn sàng cho vị
            trí mục tiêu.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAdjustModal(true)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border",
              "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300",
              "text-[13px] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[40px]",
            )}
          >
            <Settings2 size={14} />
            Điều chỉnh mục tiêu
          </button>
          <Link
            href="/candidate/practice"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-[700] hover:bg-primary-hover transition-colors min-h-[40px]"
          >
            Bắt đầu luyện tập
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Overview: full width ────────────────────────────────────────────── */}
      <RoadmapOverview summary={ROADMAP_SUMMARY} />

      {/* ── Main content: 70/30 grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">

        {/* LEFT column */}
        <div className="min-w-0">
          <NextActionCard action={NEXT_ACTION} />
          <RoadmapTimeline phases={PHASES} />
          <WeeklyPlanCard plan={WEEKLY_PLAN} />
          <PracticeRecommendations practices={RECOMMENDED_PRACTICES} />
        </div>

        {/* RIGHT column */}
        <div className="xl:sticky xl:top-6 flex flex-col gap-0">
          <SkillGapCard skills={SKILLS} />
          <MilestoneCard milestones={MILESTONES} />
          <CoachInsightCard insight={COACH_INSIGHT} />
        </div>
      </div>

      {/* ── Adjust goal modal ───────────────────────────────────────────────── */}
      {showAdjustModal && (
        <AdjustGoalModal onClose={() => setShowAdjustModal(false)} />
      )}
    </div>
  );
}
