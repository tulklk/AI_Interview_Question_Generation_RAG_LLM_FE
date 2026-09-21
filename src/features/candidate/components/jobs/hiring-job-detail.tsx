"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Building2,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  ListOrdered,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { SkillsOverflowChip } from "@/features/candidate/components/ui/skills-overflow-popover";
import { HiringJdPreview } from "@/features/candidate/components/sets/hiring-jd-preview";
import { CompanyInfoCard } from "@/features/candidate/components/sets/company-info-card";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import {
  findInProgressSession,
  abandonPracticeSession,
  getPracticeSession,
} from "@/features/candidate/services/practice-session.service";
import {
  toggleBookmark,
  getBookmarkedSetIds,
  getQuestionSetById,
  NotFoundError,
} from "@/features/candidate/services/question-set.service";
import { useToast } from "@/shared/providers/toast-context";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import { cleanTitle } from "@/features/candidate/utils/clean-title";
import { groupQuestionsForInterviewPlan } from "@/features/candidate/utils/group-questions";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import {
  formatSalaryLabel,
  workplaceLabel,
} from "@/features/candidate/utils/hiring-posting-format";
import {
  portalDivider,
  portalHeadingAlt,
  portalMutedBg,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";

type Props = {
  set: QuestionSet;
  /** panel = embed trong split desktop; page = /jobs/[id] đầy đủ */
  variant?: "page" | "panel";
};

/**
 * SCRUM-467 / SCRUM-468: detail bộ Tuyển — layout ITViec (header + CTA + JD + meta).
 */
export function HiringJobDetail({ set, variant = "page" }: Props) {
  const { t, lang } = useLanguage();
  const h = t.hiringJobsPage;
  const p = t.jobseekerSetDetailPage;
  const { addToast } = useToast();
  const router = useRouter();

  const [inProgressSessionId, setInProgressSessionId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [startNewConfirmOpen, setStartNewConfirmOpen] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    findInProgressSession(set.id)
      .then((found) => {
        if (!cancelled) setInProgressSessionId(found?.sessionId ?? null);
      })
      .catch(() => {});
    getBookmarkedSetIds().then((ids) => {
      if (!cancelled) setBookmarked(ids.has(set.id));
    });
    return () => {
      cancelled = true;
    };
  }, [set.id]);

  const title = cleanTitle(set.title) || set.title;
  const company = set.company?.trim() || "—";
  const initials = set.companyInitials || getCompanyInitials(company);
  const color = set.companyColor || getCompanyColor(company || set.id);
  const logo = set.companyLogoUrl?.trim() || null;
  const mins = set.estimatedTimeMinutes ?? set.timeLimitMinutes ?? undefined;
  const practiceUrl = `/candidate/practice/${set.id}`;
  const groups = groupQuestionsForInterviewPlan(set.questions);
  const catNames = p.categoryNames as Record<string, string>;
  const visSkills = set.skills.slice(0, 8);
  const hiddenSkills = set.skills.slice(8);
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
  const posted = set.publishedAt
    ? formatRelativeTime(set.publishedAt, lang)
    : "";

  async function checkAndNavigate(destination: string) {
    if (navigating) return;
    setNavigating(true);
    try {
      await getQuestionSetById(set.id);
      router.push(destination);
    } catch (err) {
      setNavigating(false);
      if (err instanceof NotFoundError) addToast("error", p.loadFailed);
      else addToast("error", p.loadFailed);
    }
  }

  async function handleStartNew() {
    if (!inProgressSessionId || startingNew) return;
    setStartingNew(true);
    try {
      await getQuestionSetById(set.id);
    } catch {
      setStartingNew(false);
      setStartNewConfirmOpen(false);
      addToast("error", p.loadFailed);
      return;
    }
    abandonPracticeSession(inProgressSessionId)
      .then(() => {
        router.push(practiceUrl);
      })
      .catch(async () => {
        const existing = await getPracticeSession(inProgressSessionId).catch(() => null);
        if (existing && existing.status !== "IN_PROGRESS") {
          router.push(practiceUrl);
          return;
        }
        setStartingNew(false);
        setStartNewConfirmOpen(false);
        addToast("error", p.startNewFailed);
      });
  }

  function handleToggleBookmark() {
    if (bookmarking) return;
    setBookmarking(true);
    toggleBookmark(set.id)
      .then(setBookmarked)
      .catch(() => addToast("error", t.jobseekerMarketplacePage.bookmarkFailed))
      .finally(() => setBookmarking(false));
  }

  const pill = (label: string) => (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      )}
    >
      {label}
    </span>
  );

  return (
    <div
      className={cn(
        "space-y-4",
        variant === "page" ? "mx-auto w-full max-w-6xl px-1 pb-12" : "pb-4"
      )}
    >
      {variant === "page" && (
        <Link
          href="/candidate/jobs"
          className={cn(
            "inline-flex items-center gap-1.5 text-[12px] font-semibold hover:text-primary",
            portalSubtextAlt
          )}
        >
          <ArrowLeft size={13} />
          {h.backToJobs}
        </Link>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-5",
          variant === "page" ? "lg:grid-cols-[1fr_280px] lg:items-start" : ""
        )}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="hr-glass-card overflow-hidden p-5 sm:p-6">
            <div className="flex gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-base font-bold text-white"
                style={{ background: logo ? undefined : color }}
              >
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start gap-2">
                  <h1 className={cn("text-xl font-bold leading-snug sm:text-2xl", portalHeadingAlt)}>
                    {title}
                  </h1>
                  {variant === "panel" && (
                    <Link
                      href={`/candidate/jobs/${set.id}`}
                      className="mt-1 inline-flex text-primary hover:underline"
                      title={h.openFullPage}
                    >
                      <ExternalLink size={14} />
                    </Link>
                  )}
                </div>
                <p className={cn("mt-1 flex items-center gap-1.5 text-sm", portalSubtextAlt)}>
                  <Building2 size={14} />
                  {company}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-sky-600 dark:text-sky-400">
                  <DollarSign size={14} />
                  {salary}
                </p>
              </div>
            </div>

            {/* CTA row */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={navigating}
                onClick={() => void checkAndNavigate(practiceUrl)}
                className={cn(
                  "shimmer-button group flex h-11 min-w-[180px] flex-1 items-center justify-center gap-2 rounded-xl sm:flex-none",
                  "text-[14px] font-semibold text-white hr-cta-btn",
                  "transition-transform duration-150 hover:-translate-y-px active:scale-[0.985]",
                  "disabled:cursor-not-allowed disabled:opacity-70"
                )}
              >
                {navigating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : inProgressSessionId ? (
                  <>
                    <RotateCcw size={14} />
                    {h.continueCta}
                  </>
                ) : (
                  <>
                    {h.applyCta}
                    <ChevronRight
                      size={14}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleToggleBookmark}
                disabled={bookmarking}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl border",
                  bookmarked
                    ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                    : cn(portalMutedBg, portalHeadingAlt, "border-gray-200 dark:border-gray-700")
                )}
                title={bookmarked ? h.bookmarked : h.bookmark}
              >
                {bookmarking ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Bookmark size={15} className={bookmarked ? "fill-current" : undefined} />
                )}
              </button>
            </div>

            {inProgressSessionId && (
              <button
                type="button"
                onClick={() => setStartNewConfirmOpen(true)}
                disabled={startingNew}
                className={cn(
                  "mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl border text-[13px] font-semibold sm:w-auto sm:px-4",
                  portalMutedBg,
                  portalHeadingAlt,
                  "border-gray-200 dark:border-gray-700 disabled:opacity-60"
                )}
              >
                {startingNew ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {h.startOver}
              </button>
            )}

            {/* Logistics */}
            <ul className={cn("mt-4 space-y-2 border-t pt-4 text-[13px]", portalDivider)}>
              {set.jobLocation?.trim() && (
                <li className={cn("flex items-start gap-2", portalSubtextAlt)}>
                  <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
                  <span>{set.jobLocation.trim()}</span>
                </li>
              )}
              {workplace && (
                <li className={cn("flex items-center gap-2", portalSubtextAlt)}>
                  <Users size={14} className="shrink-0 text-primary" />
                  <span>{workplace}</span>
                </li>
              )}
              {posted && (
                <li className={cn("flex items-center gap-2", portalSubtextAlt)}>
                  <Clock size={14} className="shrink-0 text-primary" />
                  <span>{h.postedAgo.replace("{{time}}", posted)}</span>
                </li>
              )}
              <li className={cn("flex flex-wrap items-center gap-3", portalSubtextAlt)}>
                <span className="inline-flex items-center gap-1">
                  <ListOrdered size={13} />
                  {h.questionsMeta.replace("{{count}}", String(set.totalQuestions))}
                </span>
                {mins != null && mins > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} />
                    {h.timeMeta.replace("{{min}}", String(mins))}
                  </span>
                )}
                {set.rating != null && (
                  <span className="inline-flex items-center gap-1">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    {set.rating.toFixed(1)}
                  </span>
                )}
              </li>
            </ul>

            {/* Skills / expertise / domain */}
            {(set.skills.length > 0 || set.jobExpertise || set.jobDomain) && (
              <div className={cn("mt-4 space-y-3 border-t border-dashed pt-4", portalDivider)}>
                {set.skills.length > 0 && (
                  <div>
                    <p className={cn("mb-1.5 text-[11px] font-semibold uppercase", portalSubtextAlt)}>
                      {h.skillsLabel}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {visSkills.map((skill) => {
                        const si = getSkillIcon(skill);
                        const SIcon = si?.icon;
                        return (
                          <span
                            key={skill}
                            className={cn(
                              "inline-flex max-w-36 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                              "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                            )}
                          >
                            {SIcon && <SIcon size={10} className={cn("shrink-0", si.className)} />}
                            <span className="truncate">{skill}</span>
                          </span>
                        );
                      })}
                      <SkillsOverflowChip skills={hiddenSkills} />
                    </div>
                  </div>
                )}
                {set.jobExpertise?.trim() && (
                  <div>
                    <p className={cn("mb-1.5 text-[11px] font-semibold uppercase", portalSubtextAlt)}>
                      {h.expertiseLabel}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {pill(set.jobExpertise.trim())}
                    </div>
                  </div>
                )}
                {set.jobDomain?.trim() && (
                  <div>
                    <p className={cn("mb-1.5 text-[11px] font-semibold uppercase", portalSubtextAlt)}>
                      {h.domainLabel}
                    </p>
                    <div className="flex flex-wrap gap-1.5">{pill(set.jobDomain.trim())}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {(set.jobDescription?.trim() || set.jdFileUrl) && (
            <div className="hr-glass-card overflow-hidden">
              <HiringJdPreview
                jobDescription={set.jobDescription}
                jdSourceType={set.jdSourceType}
                jdOriginalFileName={set.jdOriginalFileName}
                jdFileUrl={set.jdFileUrl}
              />
            </div>
          )}

          {groups.length > 0 && (
            <div className="hr-glass-card overflow-hidden">
              <div className={cn("border-b px-5 py-3.5", portalDivider)}>
                <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>{h.interviewPlanTitle}</p>
                <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>{h.interviewPlanSub}</p>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {groups.map((g) => (
                  <li key={g.key} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className={cn("text-[13px] font-semibold capitalize", portalHeadingAlt)}>
                        {catNames[g.key] ?? g.key}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${g.percentage}%` }}
                        />
                      </div>
                      <span className={cn("text-[11px] font-semibold tabular-nums", portalSubtextAlt)}>
                        {g.count}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {variant === "page" && (
          <aside className="space-y-4 lg:sticky lg:top-24">
            <CompanyInfoCard name={company} logoUrl={logo} />
            {set.jobExpertise?.trim() && (
              <div className="hr-glass-card space-y-2 p-4">
                <p className={cn("flex items-center gap-1.5 text-[12px] font-semibold", portalHeadingAlt)}>
                  <Briefcase size={13} />
                  {h.expertiseLabel}
                </p>
                <p className={cn("text-[13px]", portalSubtextAlt)}>{set.jobExpertise.trim()}</p>
              </div>
            )}
          </aside>
        )}
      </div>

      <ConfirmDialog
        open={startNewConfirmOpen}
        title={p.startNewConfirmTitle}
        message={p.startNewConfirmMessage}
        confirmLabel={p.startNewConfirmBtn}
        cancelLabel={p.startNewCancelBtn}
        variant="danger"
        loading={startingNew}
        onConfirm={() => void handleStartNew()}
        onCancel={() => setStartNewConfirmOpen(false)}
      />
    </div>
  );
}
