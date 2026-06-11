"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useUser } from "@/context/user-context";
import { buildWelcomeMessage, getTimeOfDayGreeting } from "@/lib/greeting";
import { cn } from "@/lib/utils";
import { portalBanner, portalHeadingAlt, portalSubtextAlt } from "@/lib/portal-ui";

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
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8 animate-fade-up rounded-xl p-6 md:p-8", portalBanner)}>
      <div>
        <h2 className={cn("text-[30px] font-bold leading-9", portalHeadingAlt)}>{welcomeText}</h2>
        <p className={cn("text-base leading-6 mt-2", portalSubtextAlt)}>{d.welcomeSub}</p>
      </div>
      <Link
        href="/admin/users"
        className="inline-flex h-9 min-h-9 items-center justify-center gap-2 rounded-lg bg-[#6c47ff] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5a3dd9] active:bg-[#4b2fbf] shrink-0 sm:self-start"
      >
        <UserPlus size={15} />
        {d.addUser}
      </Link>
    </div>
  );
}
