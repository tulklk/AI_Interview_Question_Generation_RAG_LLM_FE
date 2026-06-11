"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { portalHeading, portalSubtext } from "@/lib/portal-ui";
import { useLanguage } from "@/context/language-context";

export function WelcomeSection() {
  const { t } = useLanguage();
  const dp = t.dashboardPage;

  return (
    <div className="flex items-start justify-between mb-6 animate-fade-up">
      <div>
        <h2 className={cn("text-2xl font-bold", portalHeading)}>{dp.welcome}</h2>
        <p className={cn("text-sm mt-1", portalSubtext)}>{dp.welcomeSub}</p>
      </div>
      <Link
        href="/hr/generate"
        className="flex items-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shrink-0"
      >
        <Sparkles size={15} />
        {dp.generateBtn}
      </Link>
    </div>
  );
}
