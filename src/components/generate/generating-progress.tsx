"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { portalCard, portalHeading, portalIconWell, portalMutedBg, portalSubtext } from "@/lib/portal-ui";

// Pure visual progress component shown while RAG is generating questions.
// The parent (generate-form) owns the actual API call and switches view when done.
export function GeneratingProgress() {
  const { t } = useLanguage();
  const gp = t.generatePage.progress;
  const steps = t.generatePage.steps;

  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (completedSteps >= steps.length) return;
    const timer = setTimeout(() => {
      setCompletedSteps((prev) => prev + 1);
    }, 700);
    return () => clearTimeout(timer);
  }, [completedSteps, steps.length]);

  const progress = Math.min(
    Math.round((completedSteps / steps.length) * 100),
    90
  );

  return (
    <div className={cn(portalCard, "shadow-sm px-8 py-12 flex flex-col items-center w-full animate-scale-in")}>
      <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center mb-5", portalIconWell, "bg-indigo-50 dark:bg-indigo-950/40")}>
        <Sparkles size={28} className="text-primary animate-pulse" />
      </div>

      <h2 className={cn("text-xl font-bold mb-1", portalHeading)}>{gp.heading}</h2>
      <p className={cn("text-sm mb-8", portalSubtext)}>{gp.subtext}</p>

      <ol className="w-full space-y-3 mb-8">
        {steps.map((step, i) => {
          const done = i < completedSteps;
          const active = i === completedSteps;
          return (
            <li key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 shrink-0 flex items-center justify-center">
                {done ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <span
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold",
                      active
                        ? "border-primary text-primary"
                        : "border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600"
                    )}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-sm transition-colors",
                  done
                    ? "line-through text-gray-400 dark:text-gray-500"
                    : active
                    ? cn("font-medium", portalHeading)
                    : "text-gray-300 dark:text-gray-600"
                )}
              >
                {step}
              </span>
              {done && (
                <span className="ml-auto text-xs font-semibold text-emerald-500">
                  {gp.done}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className={cn("text-xs", portalSubtext)}>{gp.progressLabel}</span>
          <span className={cn("text-xs font-semibold", portalHeading)}>{progress}%</span>
        </div>
        <div className={cn("h-2 w-full rounded-full overflow-hidden", portalMutedBg)}>
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
