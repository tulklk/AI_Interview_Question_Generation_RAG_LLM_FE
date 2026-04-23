"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";
import { generatingSteps } from "@/data/generate";
import { cn } from "@/lib/utils";

export function GeneratingProgress() {
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState(0);

  useEffect(() => {
    if (completedSteps >= generatingSteps.length) {
      const timeout = setTimeout(() => router.push("/history"), 800);
      return () => clearTimeout(timeout);
    }
    const timer = setTimeout(() => {
      setCompletedSteps((prev) => prev + 1);
    }, 700);
    return () => clearTimeout(timer);
  }, [completedSteps, router]);

  const progress = Math.round((completedSteps / generatingSteps.length) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-12 flex flex-col items-center max-w-xl mx-auto w-full">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5">
        <Sparkles size={28} className="text-[#6c47ff]" />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-1">
        AI is generating your questions
      </h2>
      <p className="text-sm text-gray-400 mb-8">
        Please wait while we craft tailored interview questions...
      </p>

      <ol className="w-full space-y-3 mb-8">
        {generatingSteps.map((step, i) => {
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
                  Done
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">Progress</span>
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
