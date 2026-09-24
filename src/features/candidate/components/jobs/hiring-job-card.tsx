"use client";

import Link from "next/link";
import { Building2, DollarSign } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { SkillsOverflowChip } from "@/features/candidate/components/ui/skills-overflow-popover";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import { cleanTitle } from "@/features/candidate/utils/clean-title";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import {
  formatSalaryLabel,
  workplaceLabel,
} from "@/features/candidate/utils/hiring-posting-format";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { hiringTransitionFast } from "@/features/candidate/components/jobs/hiring-jobs-motion";

type Props = {
  set: QuestionSet;
  /** Desktop split: chọn card thay vì navigate. */
  selected?: boolean;
  onSelect?: (id: string) => void;
};

const SKILLS_SHOWN = 3;

/**
 * SCRUM-467 / SCRUM-468: compact job card for Tuyển dụng list.
 */
export function HiringJobCard({ set, selected = false, onSelect }: Props) {
  const { t, lang } = useLanguage();
  const h = t.hiringJobsPage;
  const reduced = useReducedMotion();
  const hoverLift = reduced ? undefined : { y: -1 };
  const title = cleanTitle(set.title) || set.title;
  const company = set.company?.trim() || "—";
  const initials = set.companyInitials || getCompanyInitials(company);
  const color = set.companyColor || getCompanyColor(company || set.id);
  const logo = set.companyLogoUrl?.trim() || null;
  const visSkills = set.skills.slice(0, SKILLS_SHOWN);
  const hiddenSkills = set.skills.slice(SKILLS_SHOWN);
  const posted = set.publishedAt
    ? formatRelativeTime(set.publishedAt, lang)
    : "";
  const salary = formatSalaryLabel(
    set.salaryMin,
    set.salaryMax,
    set.salaryNegotiable,
    h.salaryNegotiable
  );
  const workplace = workplaceLabel(set.workplaceType, {
    atOffice: h.workplaceAtOffice,
    hybrid: h.workplaceHybrid,
    remote: h.workplaceRemote,
  });
  const hot = set.isPinned || set.isTrending;

  const metaParts = [
    set.jobExpertise?.trim() || null,
    workplace || null,
    set.jobLocation?.trim() || null,
    set.attempts != null && set.attempts > 0
      ? h.attempts.replace("{{count}}", String(set.attempts))
      : null,
  ].filter(Boolean) as string[];

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[11px] leading-none", portalSubtextAlt)}>
          {posted ? h.postedAgo.replace("{{time}}", posted) : "\u00a0"}
        </p>
        {hot ? (
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
              set.isPinned ? "bg-rose-600" : "bg-orange-500"
            )}
          >
            {set.isPinned ? h.superHotBadge : h.hotBadge}
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          "mt-1.5 line-clamp-2 text-[15px] font-semibold leading-snug",
          selected ? "text-primary" : "group-hover:text-primary",
          portalHeadingAlt
        )}
      >
        {title}
      </h3>

      <div className="mt-2 flex items-center gap-2">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md text-[9px] font-bold text-white"
          style={{ background: logo ? undefined : color }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <p className={cn("truncate text-[12px] font-medium", portalSubtextAlt)}>{company}</p>
      </div>

      <p className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-sky-600 dark:text-sky-400">
        <DollarSign size={12} className="shrink-0" />
        {salary}
      </p>

      {metaParts.length > 0 ? (
        <p className={cn("mt-1.5 truncate text-[11px] leading-snug", portalSubtextAlt)}>
          {metaParts.join(" · ")}
        </p>
      ) : null}

      {set.skills.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {visSkills.map((skill) => {
            const si = getSkillIcon(skill);
            const SIcon = si?.icon;
            return (
              <span
                key={skill}
                className={cn(
                  "inline-flex max-w-24 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                  "border-gray-200/80 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                )}
              >
                {SIcon ? <SIcon size={10} className={cn("shrink-0", si.className)} /> : null}
                <span className="truncate">{skill}</span>
              </span>
            );
          })}
          <SkillsOverflowChip skills={hiddenSkills} />
        </div>
      ) : null}
    </>
  );

  const cardCls = cn(
    "group block rounded-xl border bg-white p-3.5 transition-colors dark:bg-gray-900/80",
    selected
      ? "border-primary/35 border-l-2 border-l-primary bg-primary/5 shadow-none"
      : "border-gray-200/90 hover:border-primary/25 dark:border-gray-700"
  );

  // Desktop split: div (không dùng <button>) vì SkillsOverflowChip cũng là button — tránh nested button.
  if (onSelect) {
    return (
      <motion.div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(set.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(set.id);
          }
        }}
        className={cn(
          cardCls,
          "w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        )}
        whileHover={hoverLift}
        transition={hiringTransitionFast}
      >
        {body}
      </motion.div>
    );
  }

  return (
    <motion.div whileHover={hoverLift} transition={hiringTransitionFast}>
      <Link href={`/candidate/jobs/${set.id}`} className={cardCls}>
        {body}
      </Link>
    </motion.div>
  );
}

/** Icon dùng EmptyState list trống */
export const HiringJobsEmptyIcon = Building2;
