"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/shared/utils/greeting";

export function WelcomeSection() {
  const { t } = useLanguage();
  const dp = t.dashboardPage;
  const { user } = useUser();

  const greeting = getTimeOfDayGreeting({
    morning: dp.greetingMorning,
    afternoon: dp.greetingAfternoon,
    evening: dp.greetingEvening,
    night: dp.greetingNight,
  });
  const displayName = user?.fullName?.trim() || "HR Manager";
  const welcomeHeading = buildWelcomeMessage(dp.welcomeTemplate, greeting, displayName);

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 animate-fade-up">
      <div>
        <h2 className={cn("text-2xl font-bold", portalHeading)}>{welcomeHeading}</h2>
        <p className={cn("text-sm mt-1", portalSubtext)}>{dp.welcomeSub}</p>
      </div>
      <Link
        href="/hr/generate"
        className="shimmer-button flex items-center gap-2 hr-cta-btn text-white text-sm font-semibold px-5 py-2.5 rounded-xl shrink-0"
      >
        <Sparkles size={15} />
        {dp.generateBtn}
      </Link>
    </div>
  );
}
