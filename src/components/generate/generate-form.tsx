"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { JdInputCard } from "./jd-input-card";
import { FileUploadArea } from "./file-upload-area";
import { ConfigurationSection } from "./configuration-section";
import { GeneratingProgress } from "./generating-progress";
import type { GenerateView } from "@/types/generate";
import { useHrSubscription } from "@/context/hr-subscription-context";
import { isOverPlanUsageQuota } from "@/data/hr-subscription";
import { useLanguage } from "@/context/language-context";

export function GenerateForm() {
  const { t } = useLanguage();
  const { planId, limits, hasFeature } = useHrSubscription();
  const [view, setView] = useState<GenerateView>("form");
  const [jdText, setJdText] = useState("");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState("");
  const [questionCount, setQuestionCount] = useState("15");

  const quotaBlocked = isOverPlanUsageQuota(planId);
  const aiBlocked = !hasFeature("aiPoweredGeneration");
  const maxRun = limits.maxQuestionsPerRun;
  const generateDisabled = quotaBlocked || aiBlocked;

  useEffect(() => {
    const n = Number(questionCount);
    if (Number.isFinite(n) && n > maxRun) {
      setQuestionCount(String(maxRun));
    }
  }, [maxRun, questionCount]);

  if (view === "generating") {
    return <GeneratingProgress />;
  }

  return (
    <div className="max-w-3xl space-y-4">
      {aiBlocked && (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/90 dark:bg-indigo-950/40 px-4 py-3 text-sm text-indigo-950 dark:text-indigo-200 animate-fade-up">
          <p className="font-semibold mb-1">{t.generatePage.noAiPlan.title}</p>
          <p className="mb-2">{t.generatePage.noAiPlan.body}</p>
          <Link
            href="/hr/settings#billing"
            className="inline-flex font-semibold text-[#6c47ff] hover:underline"
          >
            {t.generatePage.noAiPlan.goToPlans}
          </Link>
        </div>
      )}

      {quotaBlocked && !aiBlocked && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-950 dark:text-amber-200 animate-fade-up">
          <p className="font-semibold mb-1">{t.generatePage.quota.exceededTitle}</p>
          <p className="mb-2">{t.generatePage.quota.exceededBody}</p>
          <Link
            href="/hr/settings#billing"
            className="inline-flex font-semibold text-[#6c47ff] hover:underline"
          >
            {t.generatePage.quota.goToBilling}
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <div className="animate-fade-up">
          <JdInputCard value={jdText} onChange={setJdText} />
        </div>
        <div className="animate-fade-up" style={{ animationDelay: "80ms" }}>
          <FileUploadArea />
        </div>
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "160ms" }}>
        <ConfigurationSection
          role={role}
          level={level}
          questionCount={questionCount}
          jdText={jdText}
          maxQuestionsPerRun={maxRun}
          generateDisabled={generateDisabled}
          onRoleChange={setRole}
          onLevelChange={setLevel}
          onCountChange={setQuestionCount}
          onSubmit={() => setView("generating")}
        />
      </div>
    </div>
  );
}
