"use client";

import Link from "next/link";
import { Briefcase, Building2, DollarSign, MapPin, Users } from "lucide-react";
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

type Props = {
  set: QuestionSet;
  /** Desktop split: chọn card thay vì navigate. */
  selected?: boolean;
  onSelect?: (id: string) => void;
};

const SKILLS_SHOWN = 5;

/**
 * SCRUM-467 / SCRUM-468: card list Tuyển dụng — composition kiểu ITViec.
 */
export function HiringJobCard({ set, selected = false, onSelect }: Props) {
  const { t, lang } = useLanguage();
  const h = t.hiringJobsPage;
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

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[11px]", portalSubtextAlt)}>
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
          "mt-1 text-[15px] font-bold leading-snug",
          selected
            ? "text-primary"
            : "group-hover:text-primary",
          portalHeadingAlt
        )}
      >
        {title}
      </h3>

      <div className="mt-2 flex items-center gap-2">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded text-[10px] font-bold text-white"
          style={{ background: logo ? undefined : color }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <p className={cn("truncate text-[12px] font-medium uppercase tracking-wide", portalSubtextAlt)}>
          {company}
        </p>
      </div>

      <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-sky-600 dark:text-sky-400">
        <DollarSign size={13} className="shrink-0" />
        {salary}
      </p>

      <div className={cn("mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]", portalSubtextAlt)}>
        {set.jobExpertise?.trim() ? (
          <span className="inline-flex items-center gap-1">
            <Briefcase size={11} />
            {set.jobExpertise.trim()}
          </span>
        ) : null}
        {(workplace || set.jobLocation?.trim()) && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={11} />
            {[workplace, set.jobLocation?.trim()].filter(Boolean).join(" · ")}
          </span>
        )}
        {set.attempts != null && set.attempts > 0 ? (
          <span className="inline-flex items-center gap-1">
            <Users size={11} />
            {h.attempts.replace("{{count}}", String(set.attempts))}
          </span>
        ) : null}
      </div>

      {set.skills.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {visSkills.map((skill) => {
            const si = getSkillIcon(skill);
            const SIcon = si?.icon;
            return (
              <span
                key={skill}
                className={cn(
                  "inline-flex max-w-28 items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-medium",
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
    "group block rounded-xl border bg-white p-4 transition-all dark:bg-gray-900/80",
    selected
      ? "border-primary/40 shadow-[0_0_0_1px_rgba(124,58,237,0.25)] border-l-[3px] border-l-primary"
      : "border-gray-200/90 hover:border-primary/30 hover:shadow-md dark:border-gray-700"
  );

  // Desktop split: div (không dùng <button>) vì SkillsOverflowChip cũng là button — tránh nested button.
  if (onSelect) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(set.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(set.id);
          }
        }}
        className={cn(cardCls, "w-full cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40")}
      >
        {body}
      </div>
    );
  }

  return (
    <Link href={`/candidate/jobs/${set.id}`} className={cardCls}>
      {body}
    </Link>
  );
}

/** Icon dùng EmptyState list trống */
export const HiringJobsEmptyIcon = Building2;
