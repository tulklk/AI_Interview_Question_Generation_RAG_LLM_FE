"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";

export function GeneratingProgress() {
  const router = useRouter();
  const { t } = useLanguage();
  const gp = t.generatePage.progress;
  const steps = t.generatePage.steps;

  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (completedSteps >= steps.length) {
      const timeout = setTimeout(() => router.push("/history"), 800);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => {
      setCompletedSteps((prev) => prev + 1);
    }, 700);
    return () => clearTimeout(timer);
  }, [completedSteps, router, steps.length]);

  const progress = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-8 py-12 flex flex-col items-center max-w-xl mx-auto w-full animate-scale-in">
      <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center mb-5">
        <Sparkles size={28} className="text-[#6c47ff]" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-1">{gp.heading}</h2>
      <p className="text-sm text-gray-400 mb-8">{gp.subtext}</p>

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
                        ? "border-[#6c47ff] text-[#6c47ff]"
                        : "border-gray-200 text-gray-300"
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
                    ? "line-through text-gray-400"
                    : active
                    ? "text-gray-800 font-medium"
                    : "text-gray-300"
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
          <span className="text-xs text-gray-400">{gp.progressLabel}</span>
          <span className="text-xs font-semibold text-gray-600">{progress}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#6c47ff] rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
