"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ChartColumn,
  ChevronDown,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Crown,
  History,
  ListChecks,
  Loader2,
  Target,
  TriangleAlert,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Translations } from "@/core/i18n/en";
import { useLanguage, type Lang } from "@/shared/providers/language-context";
import { formatRelativeTime } from "@/shared/utils/relative-time";
import { portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import { getScoreBandRingClass, resolveScoreBandId } from "@/features/hr/utils/score-band";
import {
  getQuestionSetInsights,
  type LeaderboardItem,
  type QuestionInsightItem,
  type QuestionSetInsights,
  type RecentAttemptItem,
} from "@/features/hr/services/hr-insights.service";
import { PublishedHubInsightsSkeleton } from "./published-skeletons";

type HubLabels = Translations["publishedHubPage"];
type InsightLabels = HubLabels["insights"];

const PASS = "#10B981";
const FAIL = "#F43F5E";

/** Số dòng hiện sẵn, phần còn lại ẩn sau nút "Xem thêm" cho trang đỡ dài. */
const HIGHLIGHT_PREVIEW = 5;
const TABLE_PREVIEW = 8;
const REST_PREVIEW = 5;

const card =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900/40";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function scoreText(score: number | null): string {
  return score == null ? "—" : score.toFixed(1);
}

/** Thay các {{key}} trong chuỗi i18n. */
function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (out, [key, value]) => out.split(`{{${key}}}`).join(String(value)),
    template
  );
}

function ratio(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, part / total));
}

/** Giống tab Ứng viên để cùng một người có cùng avatar ở mọi tab. */
function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  return initials || "?";
}

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
];

function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function bandLabel(score: number, labels: InsightLabels): string {
  const id = resolveScoreBandId(score);
  if (id === "excellent") return labels.bandExcellent;
  if (id === "good") return labels.bandGood;
  if (id === "fair") return labels.bandFair;
  return labels.bandLow;
}

function attemptMeta(
  person: { attemptCount: number; isOfficialTest: boolean },
  labels: InsightLabels,
  hub: HubLabels,
  isHiring: boolean
): string {
  const parts = [fill(labels.attemptsN, { n: person.attemptCount })];
  if (isHiring) parts.push(person.isOfficialTest ? labels.official : hub.practiceOnlyBadge);
  return parts.join(" · ");
}

export function PublishedHubInsights({
  questionSetId,
  isHiring,
  includePractice,
  onIncludePracticeChange,
}: {
  questionSetId: string;
  isHiring: boolean;
  includePractice: boolean;
  onIncludePracticeChange: (next: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const h = t.publishedHubPage;
  const i = h.insights;
  const [data, setData] = useState<QuestionSetInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void getQuestionSetInsights(questionSetId, isHiring && includePractice)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [questionSetId, isHiring, includePractice]);

  const graded = useMemo(
    () => (data?.questions ?? []).filter((q) => q.evaluatedCount > 0),
    [data?.questions]
  );
  // Chỉ lấy câu thật sự có người trượt / có người đạt, tránh câu 0% lọt vào top.
  const mostWrong = useMemo(
    () =>
      graded
        .filter((q) => q.evaluatedCount - q.passCount > 0)
        .sort(
          (a, b) =>
            b.failRate - a.failRate ||
            b.evaluatedCount - b.passCount - (a.evaluatedCount - a.passCount) ||
            a.order - b.order
        ),
    [graded]
  );
  const mostRight = useMemo(
    () =>
      graded
        .filter((q) => q.passCount > 0)
        .sort((a, b) => b.passRate - a.passRate || b.passCount - a.passCount || a.order - b.order),
    [graded]
  );

  if (loading && !data) return <PublishedHubInsightsSkeleton />;

  if (error || !data) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center dark:border-gray-800">
        <p className={cn("text-sm", portalSubtext)}>{i.loadFailed}</p>
      </div>
    );
  }

  const summary = data.summary;
  const leaders = data.leaderboard;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium dark:border-gray-800 dark:bg-gray-900/40",
            portalSubtext
          )}
        >
          <Target size={13} className="text-primary" aria-hidden />
          {fill(i.threshold, { score: data.passThreshold })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {loading && (
            <span className={cn("inline-flex items-center gap-1.5 text-xs", portalSubtext)}>
              <Loader2 size={12} className="animate-spin" aria-hidden /> {i.loading}
            </span>
          )}
          {isHiring && (
            <PracticeSwitch
              checked={includePractice}
              onChange={onIncludePracticeChange}
              label={h.showPracticeToggle}
              hint={h.showPracticeHint}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          tone="violet"
          label={isHiring ? h.metricApplicants : h.metricAttempts}
          value={String(summary.completedCount)}
          sub={i.metricCompletedSub}
        />
        <KpiCard
          icon={ChartColumn}
          tone="sky"
          label={h.metricAvgScore}
          value={scoreText(summary.averageScore)}
          valueClassName={
            summary.averageScore != null ? getScoreBandRingClass(summary.averageScore).text : undefined
          }
          extra={
            summary.averageScore != null ? (
              <ScorePill score={summary.averageScore} text={bandLabel(summary.averageScore, i)} />
            ) : null
          }
          sub={h.metricAvgScoreSub}
        />
        <KpiCard
          icon={CircleCheck}
          tone="emerald"
          label={i.metricPass}
          value={summary.evaluatedAnswerCount > 0 ? pct(summary.passRateOverall) : "—"}
          sub={i.metricPassSub}
        >
          {summary.evaluatedAnswerCount > 0 && (
            <ProgressBar value={summary.passRateOverall} color={PASS} className="mt-2" />
          )}
        </KpiCard>
        <KpiCard
          icon={ClipboardCheck}
          tone="amber"
          label={i.metricEvaluated}
          value={String(summary.evaluatedAnswerCount)}
          sub={i.metricEvaluatedSub}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className={cn(card, "relative isolate overflow-hidden p-4 sm:p-5 lg:col-span-2")}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.18),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10),transparent_65%)]"
          />
          <SectionHeader
            icon={Trophy}
            iconClassName="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
            title={isHiring ? i.leaderboardApplicants : i.leaderboardTitle}
            hint={i.rankingHint}
            right={leaders.length > 0 ? <CountChip>{fill(i.peopleCount, { n: leaders.length })}</CountChip> : null}
          />
          {leaders.length === 0 ? (
            <EmptyHint icon={Trophy} title={i.emptyTitle} body={i.emptyBody} className="mt-5" />
          ) : (
            <>
              <Podium people={leaders.slice(0, 3)} labels={i} hub={h} isHiring={isHiring} />
              {leaders.length > 3 && (
                <RestList people={leaders.slice(3)} labels={i} hub={h} isHiring={isHiring} />
              )}
            </>
          )}
        </section>

        <section className={cn(card, "p-4 sm:p-5")}>
          <SectionHeader
            icon={History}
            iconClassName="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
            title={i.recentTitle}
          />
          {data.recentAttempts.length === 0 ? (
            <EmptyHint title={i.emptyTitle} body={i.emptyBody} className="mt-4" />
          ) : (
            <RecentList items={data.recentAttempts} labels={i} hub={h} isHiring={isHiring} lang={lang} />
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <QuestionHighlight
          tone="fail"
          icon={CircleX}
          title={i.mostWrong}
          hint={i.mostWrongHint}
          items={mostWrong}
          empty={graded.length === 0 ? i.noGraded : i.noneWrong}
          labels={i}
        />
        <QuestionHighlight
          tone="pass"
          icon={CircleCheck}
          title={i.mostRight}
          hint={i.mostRightHint}
          items={mostRight}
          empty={graded.length === 0 ? i.noGraded : i.noneRight}
          labels={i}
        />
      </div>

      <QuestionTable items={data.questions ?? []} labels={i} />
    </div>
  );
}

/* ───────────────────────── Khối dùng chung ───────────────────────── */

const KPI_TONE = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
} as const;

function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  valueClassName,
  extra,
  children,
}: {
  icon: LucideIcon;
  tone: keyof typeof KPI_TONE;
  label: string;
  value: string;
  sub: string;
  valueClassName?: string;
  extra?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={cn(card, "p-4")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", KPI_TONE[tone])}>
          <Icon size={16} aria-hidden />
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className={cn("text-2xl font-bold tabular-nums", valueClassName ?? portalHeading)}>{value}</p>
        {extra}
      </div>
      {children}
      <p className={cn("mt-1.5 text-[11px]", portalSubtext)}>{sub}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  iconClassName,
  title,
  hint,
  right,
}: {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  hint?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", iconClassName)}>
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className={cn("text-sm font-semibold", portalHeading)}>{title}</h3>
          {hint ? <p className={cn("text-[11px] leading-snug", portalSubtext)}>{hint}</p> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

function CountChip({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-gray-600 dark:bg-gray-800 dark:text-gray-300">
      {children}
    </span>
  );
}

function ProgressBar({ value, color, className }: { value: number; color: string; className?: string }) {
  const width = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800", className)}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${width}%`, background: color }} />
    </div>
  );
}

function ScorePill({ score, text, className }: { score: number; text: string; className?: string }) {
  const band = getScoreBandRingClass(score);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
        band.bg,
        band.text,
        className
      )}
    >
      {text}
    </span>
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  const safe = name || "?";
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
        avatarColor(safe),
        className
      )}
    >
      {getInitials(safe)}
    </span>
  );
}

function TypeBadge({ official, labels, hub }: { official: boolean; labels: InsightLabels; hub: HubLabels }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-px text-[10px] font-semibold",
        official
          ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
      )}
    >
      {official ? labels.official : hub.practiceOnlyBadge}
    </span>
  );
}

function ShowMoreButton({
  expanded,
  moreText,
  lessText,
  onToggle,
  className,
}: {
  expanded: boolean;
  moreText: string;
  lessText: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className={cn(
        "mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5",
        className
      )}
    >
      {expanded ? lessText : moreText}
      <ChevronDown size={14} className={cn("transition-transform", expanded && "rotate-180")} aria-hidden />
    </button>
  );
}

function EmptyHint({
  icon: Icon,
  title,
  body,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center dark:border-gray-800", className)}>
      {Icon ? <Icon size={22} className="mx-auto text-gray-300 dark:text-gray-600" aria-hidden /> : null}
      <p className={cn("text-sm font-medium", Icon && "mt-2", portalHeading)}>{title}</p>
      {body ? <p className={cn("mt-1 text-xs", portalSubtext)}>{body}</p> : null}
    </div>
  );
}

function PracticeSwitch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      title={hint}
      className="inline-flex cursor-pointer select-none items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-3.5 dark:border-gray-800 dark:bg-gray-900/40"
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-5 w-9 shrink-0 rounded-full bg-gray-200 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 dark:bg-gray-700"
      />
      <span className={cn("text-xs font-semibold", portalHeading)}>
        {label}
        <span className={cn("hidden font-normal xl:inline", portalSubtext)}> · {hint}</span>
      </span>
    </label>
  );
}

/* ───────────────────────── Bục top 1 · 2 · 3 ───────────────────────── */

type Place = 1 | 2 | 3;

const MEDAL: Record<
  Place,
  { order: string; frame: string; badge: string; block: string; number: string; height: string }
> = {
  1: {
    order: "order-2",
    frame: "from-amber-200 via-amber-400 to-amber-500",
    badge: "bg-amber-400 text-amber-950",
    block:
      "from-amber-100 to-amber-50/30 border-amber-200 dark:from-amber-400/25 dark:to-amber-400/5 dark:border-amber-400/30",
    number: "text-amber-500 dark:text-amber-300",
    height: "h-24 sm:h-28",
  },
  2: {
    order: "order-1",
    frame: "from-slate-100 via-slate-300 to-slate-400",
    badge: "bg-slate-300 text-slate-800",
    block:
      "from-slate-100 to-slate-50/30 border-slate-200 dark:from-slate-300/20 dark:to-slate-300/5 dark:border-slate-400/30",
    number: "text-slate-500 dark:text-slate-300",
    height: "h-16 sm:h-20",
  },
  3: {
    order: "order-3",
    frame: "from-orange-200 via-orange-300 to-orange-500",
    badge: "bg-orange-400 text-orange-950",
    block:
      "from-orange-100 to-orange-50/30 border-orange-200 dark:from-orange-400/20 dark:to-orange-400/5 dark:border-orange-400/30",
    number: "text-orange-400 dark:text-orange-300",
    height: "h-12 sm:h-14",
  },
};

function Podium({
  people,
  labels,
  hub,
  isHiring,
}: {
  people: LeaderboardItem[];
  labels: InsightLabels;
  hub: HubLabels;
  isHiring: boolean;
}) {
  const places: Place[] = [1, 2, 3];
  return (
    <div className="mx-auto mt-6 max-w-2xl">
      {/* DOM theo thứ tự 1-2-3 cho screen reader, CSS order đẩy hạng 1 ra giữa. */}
      <ol className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {places.map((place) => (
          <PodiumSlot
            key={place}
            place={place}
            person={people[place - 1]}
            labels={labels}
            hub={hub}
            isHiring={isHiring}
          />
        ))}
      </ol>
      <div className="h-2 rounded-b-xl bg-gray-100 dark:bg-gray-800/70" aria-hidden />
    </div>
  );
}

function PodiumSlot({
  place,
  person,
  labels,
  hub,
  isHiring,
}: {
  place: Place;
  person: LeaderboardItem | undefined;
  labels: InsightLabels;
  hub: HubLabels;
  isHiring: boolean;
}) {
  const medal = MEDAL[place];
  const first = place === 1;
  const name = person?.candidateName || "—";
  const href = person ? `/hr/candidates/${person.candidateUserId}` : "";

  return (
    <li className={cn("flex min-w-0 flex-col items-center", medal.order)} aria-label={fill(labels.rankLabel, { n: place })}>
      <div className="flex w-full min-w-0 flex-col items-center px-0.5 pb-3 text-center">
        {person ? (
          <>
            {first && (
              <Crown
                size={22}
                aria-hidden
                className="mb-1 fill-amber-300 text-amber-500 dark:fill-amber-400/80 dark:text-amber-300"
              />
            )}
            <Link href={href} tabIndex={-1} aria-hidden className="relative">
              <span className={cn("block rounded-full bg-linear-to-br p-[3px] shadow-sm", medal.frame)}>
                <span
                  className={cn(
                    "flex items-center justify-center rounded-full font-bold text-white",
                    avatarColor(name),
                    first
                      ? "h-16 w-16 text-lg sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl"
                      : "h-12 w-12 text-sm sm:h-14 sm:w-14 sm:text-base"
                  )}
                >
                  {getInitials(name)}
                </span>
              </span>
              <span
                className={cn(
                  "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold shadow ring-2 ring-white dark:ring-gray-900",
                  medal.badge
                )}
              >
                {place}
              </span>
            </Link>
            <Link
              href={href}
              title={name}
              className={cn(
                "mt-2.5 block max-w-full truncate font-semibold hover:underline",
                first ? "text-sm sm:text-base" : "text-xs sm:text-sm",
                portalHeading
              )}
            >
              {name}
            </Link>
            <p className={cn("mt-1 text-[11px] font-semibold tabular-nums sm:text-xs", portalHeading)}>
              {fill(labels.passOf, { pass: person.passCount, total: person.evaluatedCount })}
            </p>
            <ProgressBar
              value={ratio(person.passCount, person.evaluatedCount)}
              color={PASS}
              className="mt-1.5 w-full max-w-[8rem]"
            />
            <ScorePill
              score={person.bestOverallScore}
              text={fill(labels.points, { score: person.bestOverallScore.toFixed(1) })}
              className="mt-2"
            />
            <p className={cn("mt-1 text-[10px] leading-tight sm:text-[11px]", portalSubtext)}>
              {attemptMeta(person, labels, hub, isHiring)}
            </p>
          </>
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-300 sm:h-14 sm:w-14 dark:border-gray-700 dark:text-gray-600">
              <Users size={18} aria-hidden />
            </span>
            <p className={cn("mt-2.5 text-xs font-medium", portalSubtext)}>{labels.podiumEmpty}</p>
          </>
        )}
      </div>
      <div
        className={cn(
          "flex w-full justify-center rounded-t-xl border border-b-0 bg-linear-to-b pt-2",
          medal.block,
          medal.height,
          !person && "opacity-40"
        )}
      >
        <span className={cn("text-3xl font-black leading-none tabular-nums sm:text-4xl", medal.number)}>{place}</span>
      </div>
    </li>
  );
}

function RestList({
  people,
  labels,
  hub,
  isHiring,
}: {
  people: LeaderboardItem[];
  labels: InsightLabels;
  hub: HubLabels;
  isHiring: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? people : people.slice(0, REST_PREVIEW);

  return (
    <div className="mt-5 border-t border-gray-100 pt-2 dark:border-gray-800">
      <ol className="mx-auto max-w-3xl divide-y divide-gray-100 dark:divide-gray-800/80">
        {shown.map((p) => {
          const passOf = fill(labels.passOf, { pass: p.passCount, total: p.evaluatedCount });
          return (
            <li key={p.candidateUserId} className="flex items-center gap-3 py-2.5">
              <span className="w-8 shrink-0 text-center text-xs font-bold tabular-nums text-gray-400 dark:text-gray-500">
                #{p.rank}
              </span>
              <Avatar name={p.candidateName} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/hr/candidates/${p.candidateUserId}`}
                  className={cn("block truncate text-sm font-medium hover:underline", portalHeading)}
                >
                  {p.candidateName || "—"}
                </Link>
                <p className={cn("truncate text-[11px]", portalSubtext)}>
                  <span className="sm:hidden">{passOf} · </span>
                  {attemptMeta(p, labels, hub, isHiring)}
                </p>
              </div>
              <div className="hidden w-36 shrink-0 sm:block">
                <p className={cn("text-right text-[11px] font-semibold tabular-nums", portalHeading)}>{passOf}</p>
                <ProgressBar value={ratio(p.passCount, p.evaluatedCount)} color={PASS} className="mt-1" />
              </div>
              <ScorePill score={p.bestOverallScore} text={p.bestOverallScore.toFixed(1)} />
            </li>
          );
        })}
      </ol>
      {people.length > REST_PREVIEW && (
        <ShowMoreButton
          expanded={expanded}
          moreText={fill(labels.showMore, { n: people.length - REST_PREVIEW })}
          lessText={labels.showLess}
          onToggle={() => setExpanded((v) => !v)}
        />
      )}
    </div>
  );
}

function RecentList({
  items,
  labels,
  hub,
  isHiring,
  lang,
}: {
  items: RecentAttemptItem[];
  labels: InsightLabels;
  hub: HubLabels;
  isHiring: boolean;
  lang: Lang;
}) {
  return (
    <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800/80">
      {items.map((row) => (
        <li key={row.sessionId} className="flex items-center gap-3 py-2.5">
          <Avatar name={row.candidateName} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/hr/candidates/${row.candidateUserId}/sessions/${row.sessionId}`}
              className={cn("block truncate text-sm font-medium hover:underline", portalHeading)}
            >
              {row.candidateName || "—"}
            </Link>
            <p className={cn("mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]", portalSubtext)}>
              <span>{row.completedAt ? formatRelativeTime(row.completedAt, lang) : "—"}</span>
              {isHiring && <TypeBadge official={row.isOfficialTest} labels={labels} hub={hub} />}
            </p>
          </div>
          {row.overallScore == null ? (
            <span className={cn("text-sm tabular-nums", portalSubtext)}>—</span>
          ) : (
            <ScorePill score={row.overallScore} text={row.overallScore.toFixed(1)} />
          )}
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────── Câu hỏi ───────────────────────── */

function difficultyChip(raw: string, labels: InsightLabels): { label: string; className: string } | null {
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (key === "easy") {
    return {
      label: labels.diffEasy,
      className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  }
  if (key === "medium") {
    return {
      label: labels.diffMedium,
      className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    };
  }
  if (key === "hard") {
    return { label: labels.diffHard, className: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300" };
  }
  return { label: raw, className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" };
}

function QuestionMeta({
  question,
  labels,
  showFlag = false,
  className,
}: {
  question: QuestionInsightItem;
  labels: InsightLabels;
  showFlag?: boolean;
  className?: string;
}) {
  const diff = difficultyChip(question.difficulty, labels);
  const flag = showFlag ? question.qualityFlag : null;
  if (!question.skill && !diff && !flag) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {question.skill ? (
        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {question.skill}
        </span>
      ) : null}
      {diff ? (
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", diff.className)}>{diff.label}</span>
      ) : null}
      {flag ? (
        // Nhãn chất lượng có viền + icon để không lẫn với chip độ khó (Dễ / Khó).
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-1.5 py-px text-[10px] font-semibold",
            flag === "tooEasy"
              ? "border-amber-300 text-amber-700 dark:border-amber-500/40 dark:text-amber-300"
              : "border-red-300 text-red-600 dark:border-red-500/40 dark:text-red-300"
          )}
        >
          <TriangleAlert size={10} aria-hidden />
          {flag === "tooEasy" ? labels.tooEasy : labels.tooHard}
        </span>
      ) : null}
    </div>
  );
}

function QuestionHighlight({
  tone,
  icon,
  title,
  hint,
  items,
  empty,
  labels,
}: {
  tone: "pass" | "fail";
  icon: LucideIcon;
  title: string;
  hint: string;
  items: QuestionInsightItem[];
  empty: string;
  labels: InsightLabels;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = tone === "pass" ? PASS : FAIL;
  const shown = expanded ? items : items.slice(0, HIGHLIGHT_PREVIEW);

  return (
    <section className={cn(card, "p-4 sm:p-5")}>
      <SectionHeader
        icon={icon}
        iconClassName={
          tone === "pass"
            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300"
        }
        title={title}
        hint={hint}
        right={items.length > 0 ? <CountChip>{items.length}</CountChip> : null}
      />
      {items.length === 0 ? (
        <p className={cn("py-8 text-center text-xs", portalSubtext)}>{empty}</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {shown.map((q, index) => {
            const count = tone === "pass" ? q.passCount : q.evaluatedCount - q.passCount;
            const rate = tone === "pass" ? q.passRate : q.failRate;
            return (
              <li key={q.questionId} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
                  style={{ color, backgroundColor: `${color}1A` }}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("line-clamp-2 text-sm leading-snug", portalHeading)} title={q.questionText}>
                    <span className="mr-1.5 font-semibold text-gray-400 dark:text-gray-500">#{q.order}</span>
                    {q.questionText}
                  </p>
                  <QuestionMeta question={q} labels={labels} className="mt-1.5" />
                </div>
                <div className="w-[4.5rem] shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums" style={{ color }}>
                    {pct(rate)}
                  </p>
                  <p className={cn("text-[10px] tabular-nums", portalSubtext)}>
                    {fill(tone === "pass" ? labels.passedOf : labels.failedOf, {
                      n: count,
                      total: q.evaluatedCount,
                    })}
                  </p>
                  <ProgressBar value={rate} color={color} className="mt-1 h-1" />
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {items.length > HIGHLIGHT_PREVIEW && (
        <ShowMoreButton
          expanded={expanded}
          moreText={fill(labels.showMore, { n: items.length - HIGHLIGHT_PREVIEW })}
          lessText={labels.showLess}
          onToggle={() => setExpanded((v) => !v)}
        />
      )}
    </section>
  );
}

type QuestionFilter = "all" | "tooHard" | "tooEasy" | "ungraded";
type QuestionSort = "order" | "hardest" | "easiest";

/** Câu chưa ai làm luôn nằm cuối khi sort theo tỷ lệ. */
function gradedFirst(a: QuestionInsightItem, b: QuestionInsightItem): number {
  return (a.evaluatedCount === 0 ? 1 : 0) - (b.evaluatedCount === 0 ? 1 : 0);
}

function QuestionTable({ items, labels }: { items: QuestionInsightItem[]; labels: InsightLabels }) {
  const [filter, setFilter] = useState<QuestionFilter>("all");
  const [sort, setSort] = useState<QuestionSort>("order");
  const [expanded, setExpanded] = useState(false);

  const counts = useMemo<Record<QuestionFilter, number>>(
    () => ({
      all: items.length,
      tooHard: items.filter((q) => q.qualityFlag === "tooHard").length,
      tooEasy: items.filter((q) => q.qualityFlag === "tooEasy").length,
      ungraded: items.filter((q) => q.evaluatedCount === 0).length,
    }),
    [items]
  );

  // Data đổi (bật/tắt người luyện) có thể làm chip đang chọn biến mất, khi đó quay về Tất cả.
  const activeFilter: QuestionFilter =
    filter !== "all" && (counts[filter] === 0 || counts[filter] === counts.all) ? "all" : filter;

  const rows = useMemo(() => {
    const filtered = items.filter((q) => {
      if (activeFilter === "tooHard") return q.qualityFlag === "tooHard";
      if (activeFilter === "tooEasy") return q.qualityFlag === "tooEasy";
      if (activeFilter === "ungraded") return q.evaluatedCount === 0;
      return true;
    });
    if (sort === "hardest") {
      return filtered.sort((a, b) => gradedFirst(a, b) || b.failRate - a.failRate || a.order - b.order);
    }
    if (sort === "easiest") {
      return filtered.sort((a, b) => gradedFirst(a, b) || b.passRate - a.passRate || a.order - b.order);
    }
    return filtered.sort((a, b) => a.order - b.order);
  }, [items, activeFilter, sort]);

  if (items.length === 0) {
    return <EmptyHint icon={ListChecks} title={labels.noQuestions} />;
  }

  const filterOptions: { key: QuestionFilter; label: string; dot?: string }[] = [
    { key: "all", label: labels.filterAll },
    { key: "tooHard", label: labels.tooHard, dot: "bg-red-500" },
    { key: "tooEasy", label: labels.tooEasy, dot: "bg-amber-500" },
    { key: "ungraded", label: labels.filterUngraded, dot: "bg-gray-400" },
  ];
  // Ẩn chip rỗng và chip trùng với "Tất cả" (vd: chưa ai làm thì cả 30 câu đều "Chưa chấm").
  const visibleFilters = filterOptions.filter(
    (f) => f.key === "all" || (counts[f.key] > 0 && counts[f.key] < counts.all)
  );
  const sortOptions: { key: QuestionSort; label: string }[] = [
    { key: "order", label: labels.sortOrder },
    { key: "hardest", label: labels.sortHardest },
    { key: "easiest", label: labels.sortEasiest },
  ];
  const shown = expanded ? rows : rows.slice(0, TABLE_PREVIEW);
  const gridCols = "md:grid-cols-[2.25rem_minmax(0,1fr)_4.5rem_4.5rem_11rem]";

  return (
    <section className={cn(card, "overflow-hidden")}>
      <div className="flex flex-col gap-3 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader
          icon={ListChecks}
          iconClassName="bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
          title={labels.questionsTitle}
          hint={labels.sampleHint}
          right={<CountChip>{items.length}</CountChip>}
        />
        <div
          role="group"
          className="inline-flex w-full shrink-0 rounded-lg bg-gray-100 p-0.5 sm:w-auto dark:bg-gray-800/80"
        >
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              aria-pressed={sort === opt.key}
              onClick={() => setSort(opt.key)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none",
                sort === opt.key
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {visibleFilters.length > 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-4 sm:px-5">
          {visibleFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={activeFilter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                activeFilter === f.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
              )}
            >
              {f.dot ? <span className={cn("h-1.5 w-1.5 rounded-full", f.dot)} aria-hidden /> : null}
              {f.label}
              <span className="tabular-nums opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          "hidden gap-4 border-y border-gray-100 bg-gray-50/70 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 md:grid dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-500",
          gridCols
        )}
      >
        <span>#</span>
        <span>{labels.colQuestion}</span>
        <span className="text-right">{labels.colEvaluated}</span>
        <span className="text-right">{labels.colAvg}</span>
        <span>{labels.colResult}</span>
      </div>

      <ul className="divide-y divide-gray-100 border-t border-gray-100 md:border-t-0 dark:divide-gray-800/80 dark:border-gray-800">
        {shown.map((q) => (
          <QuestionRow key={q.questionId} question={q} labels={labels} gridCols={gridCols} />
        ))}
      </ul>

      {rows.length > TABLE_PREVIEW && (
        <div className="border-t border-gray-100 px-4 py-1.5 dark:border-gray-800">
          <ShowMoreButton
            expanded={expanded}
            moreText={fill(labels.showAllQuestions, { n: rows.length })}
            lessText={labels.showLess}
            onToggle={() => setExpanded((v) => !v)}
            className="mt-0"
          />
        </div>
      )}
    </section>
  );
}

function QuestionRow({
  question: q,
  labels,
  gridCols,
}: {
  question: QuestionInsightItem;
  labels: InsightLabels;
  gridCols: string;
}) {
  const fail = Math.max(0, q.evaluatedCount - q.passCount);
  const avgClass = q.averageScore != null ? getScoreBandRingClass(q.averageScore).text : portalSubtext;

  return (
    <li
      className={cn(
        "grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-gray-50/70 sm:px-5 md:items-center md:gap-4 dark:hover:bg-gray-800/30",
        gridCols
      )}
    >
      <span className="inline-flex h-6 min-w-6 items-center justify-center self-start rounded-lg bg-gray-100 px-1.5 text-[11px] font-bold tabular-nums text-gray-600 md:self-center dark:bg-gray-800 dark:text-gray-300">
        {q.order}
      </span>
      <div className="min-w-0">
        <p className={cn("line-clamp-2 text-sm leading-snug", portalHeading)} title={q.questionText}>
          {q.questionText}
        </p>
        <QuestionMeta question={q} labels={labels} showFlag className="mt-1.5" />
      </div>

      {/* Mobile: gom số liệu xuống dưới câu hỏi */}
      <div className="col-start-2 space-y-1.5 md:hidden">
        <p className={cn("text-[11px] tabular-nums", portalSubtext)}>
          {labels.colEvaluated} <span className={cn("font-semibold", portalHeading)}>{q.evaluatedCount}</span>
          {" · "}
          {labels.colAvg} <span className={cn("font-semibold", avgClass)}>{scoreText(q.averageScore)}</span>
        </p>
        <PassFailBar pass={q.passCount} fail={fail} labels={labels} />
      </div>

      <span className={cn("hidden text-right text-sm tabular-nums md:block", portalSubtext)}>{q.evaluatedCount}</span>
      <span className={cn("hidden text-right text-sm font-semibold tabular-nums md:block", avgClass)}>
        {scoreText(q.averageScore)}
      </span>
      <div className="hidden md:block">
        <PassFailBar pass={q.passCount} fail={fail} labels={labels} />
      </div>
    </li>
  );
}

function PassFailBar({ pass, fail, labels }: { pass: number; fail: number; labels: InsightLabels }) {
  const total = pass + fail;
  if (total === 0) {
    return <span className="text-[11px] italic text-gray-400 dark:text-gray-500">{labels.filterUngraded}</span>;
  }
  return (
    <div>
      <div className="flex h-2 gap-px overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        {pass > 0 && <div className="h-full" style={{ width: `${(pass / total) * 100}%`, background: PASS }} />}
        {fail > 0 && <div className="h-full" style={{ width: `${(fail / total) * 100}%`, background: FAIL }} />}
      </div>
      <div className="mt-1 flex justify-between gap-2 text-[11px] font-semibold tabular-nums">
        <span className={pass > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500"}>
          {fill(labels.passedOf, { n: pass, total })}
        </span>
        <span className={fail > 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-400 dark:text-gray-500"}>
          {fill(labels.failedOf, { n: fail, total })}
        </span>
      </div>
    </div>
  );
}
