"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Map } from "lucide-react";
import { JobseekerAppShell } from "@/features/candidate/components/layout/jobseeker-app-shell";
import { getCoachRoadmap, type CoachRoadmap } from "@/features/candidate/services/coach.service";
import {
  CoachJourneyPath,
  roadmapScoreProgress,
  roadmapTopicProgress,
} from "@/features/candidate/components/coach/coach-journey-path";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { useLanguage } from "@/shared/providers/language-context";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export default function CoachRoadmapDetailPage() {
  return (
    <JobseekerAppShell
      pageTitle="AI Coach"
      breadcrumb={[
        { label: "jobseeker", href: "/candidate/dashboard" },
        { label: "coach", href: "/candidate/coach" },
        { label: "roadmap" },
      ]}
    >
      <CoachRoadmapDetail />
    </JobseekerAppShell>
  );
}

function CoachRoadmapDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const [roadmap, setRoadmap] = useState<CoachRoadmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getCoachRoadmap(id)
      .then(setRoadmap)
      .catch(() => setError(p.roadmapStartFailed));
  }, [id, p.roadmapStartFailed]);

  if (error) return <p className="text-[13px] text-red-600">{error}</p>;
  if (!roadmap) return <p className={cn("text-[13px]", portalSubtextAlt)}>{p.loadingPlan}</p>;

  const si = getSkillIcon(roadmap.skill);
  const SIcon = si?.icon;
  const topicProg = roadmapTopicProgress(roadmap);
  const scoreProg = roadmapScoreProgress(roadmap);

  return (
    <div className="space-y-4">
      <Link href="/candidate/coach?step=6" className="text-[12px] font-semibold text-primary hover:underline">
        ← {p.phaseRoadmapTitle}
      </Link>

      <div className="hr-glass-card px-5 py-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shrink-0">
            {SIcon ? <SIcon size={18} className={si.className} /> : <Map size={16} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-[16px] font-bold", portalHeadingAlt)}>{roadmap.skill}</p>
            <p className={cn("text-[12px]", portalSubtextAlt)}>
              {p.priorityScoreLabel}: {roadmap.priorityScore.toFixed(1)} · {roadmap.status}
            </p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-valuenow={scoreProg}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                roadmap.status === "Completed" ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${scoreProg}%` }}
            />
          </div>
          <p className={cn("text-[11px]", portalSubtextAlt)}>
            {fillTemplate(p.journeyProgress, {
              done: String(topicProg.done),
              total: String(topicProg.total),
              percent: String(topicProg.percent),
            })}
          </p>
        </div>
      </div>

      {/* SCRUM-460: cùng journey path — read-only CTA drill (chỉ link set nếu có). */}
      <div className="hr-glass-card px-5 py-4">
        <CoachJourneyPath roadmap={roadmap} interactive={false} />
      </div>
    </div>
  );
}
