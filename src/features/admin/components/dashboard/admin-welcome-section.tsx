"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { useUser } from "@/features/auth/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/shared/utils/greeting";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";

export function AdminWelcomeSection() {
  const { t } = useLanguage();
  const { user, loading } = useUser();
  const d = t.adminPages.dashboard;

  const greeting = getTimeOfDayGreeting({
    morning: d.greetingMorning,
    afternoon: d.greetingAfternoon,
    evening: d.greetingEvening,
    night: d.greetingNight,
  });
  const displayName = user?.fullName || (loading ? "..." : d.defaultUserName);
  const welcomeText = buildWelcomeMessage(d.welcomeTemplate, greeting, displayName);

  return (
    <div className="hr-quick-generate flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 animate-fade-up rounded-xl p-6 md:p-8">
      <div>
        <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{welcomeText}</h2>
        <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{d.welcomeSub}</p>
      </div>
      <Link
        href="/admin/users"
        className="shimmer-button inline-flex h-9 min-h-9 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white hr-cta-btn shrink-0 sm:self-start"
      >
        <UserPlus size={15} />
        {d.addUser}
      </Link>
    </div>
  );
}
