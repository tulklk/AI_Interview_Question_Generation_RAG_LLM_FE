"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Clock, BarChart2, Users, Star, X,
  ChevronRight, Zap, RotateCcw, Bookmark, Loader2, RefreshCw, EyeOff,
  Code2, MessageSquare, Compass, Bug, Network, Layers,
  CheckCircle2, Lock, BrainCircuit, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLanguage } from "@/shared/providers/language-context";
import type { QuestionSet } from "@/features/candidate/types/jobseeker";
import { DifficultyPill } from "@/features/candidate/components/ui/pill";
import { CompanyInfoCard } from "./company-info-card";
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
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import {
  portalDivider,
  portalHeadingAlt,
  portalMutedBg,
  portalSubtextAlt,
} from "@/shared/utils/portal-ui";
import { cleanTitle } from "@/features/candidate/utils/clean-title";
import { groupQuestionsForInterviewPlan } from "@/features/candidate/utils/group-questions";

interface SetDetailProps {
  set: QuestionSet;
}

// ── Company modal ─────────────────────────────────────────────────────────────
function CompanyModal({ name, logoUrl, onClose }: {
  name: string;
  logoUrl?: string | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-7 h-7 rounded-full bg-gray-800 border border-gray-700 text-gray-300 flex items-center justify-center hover:bg-gray-700 hover:text-white transition-colors"
        >
          <X size={13} />
        </button>
        <CompanyInfoCard name={name} logoUrl={logoUrl} />
      </div>
    </div>
  );
}

// ── Estimated-time helpers ────────────────────────────────────────────────────
function parseEstimatedMinutes(raw: string): number | null {
  const s = raw.trim().replace(/^[~≈\-+]/, "").trim();
  const hm = s.match(/^(\d+)\s*(?:h(?:ours?)?|giờ)\s*(?:(\d+)\s*(?:m(?:in(?:utes?)?)?|phút)?)?/i);
  if (hm) return parseInt(hm[1], 10) * 60 + (hm[2] ? parseInt(hm[2], 10) : 0);
  const m = s.match(/^(\d+)(?:\s*(?:m(?:in(?:utes?)?)?|phút))?$/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

function fmtEstimatedTime(
  raw: string | undefined | null,
  l: { estimatedTime: string; avgMinutesSuffix: string; hoursUnit: string },
): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  // Only keep the "~" prefix when the backend explicitly marks the value as an estimate
  const prefix = /^[~≈]/.test(trimmed) ? l.estimatedTime : "";
  const mins = parseEstimatedMinutes(trimmed);
  if (mins !== null && mins > 0) {
    if (mins < 60) return `${prefix}${mins}${l.avgMinutesSuffix}`;
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem === 0
      ? `${prefix}${h}${l.hoursUnit}`
      : `${prefix}${h}${l.hoursUnit} ${rem}${l.avgMinutesSuffix}`;
  }
  return trimmed;
}

// ── Skill display-name normalization ─────────────────────────────────────────
// Maps lowercased API skill strings → correct brand/tech capitalization.
const SKILL_NAMES: Record<string, string> = {
  git: "Git", github: "GitHub", gitlab: "GitLab",
  javascript: "JavaScript", typescript: "TypeScript",
  "node.js": "Node.js", nodejs: "Node.js",
  "react.js": "React", reactjs: "React",
  "vue.js": "Vue.js", vuejs: "Vue.js",
  html: "HTML", css: "CSS", sql: "SQL", nosql: "NoSQL",
  mongodb: "MongoDB", postgresql: "PostgreSQL", mysql: "MySQL",
  redis: "Redis", graphql: "GraphQL",
  docker: "Docker", kubernetes: "Kubernetes",
  aws: "AWS", gcp: "GCP", azure: "Azure",
  "ci/cd": "CI/CD", cicd: "CI/CD", api: "API",
  rest: "REST", "rest api": "REST API", restapi: "REST API",
  php: "PHP", ios: "iOS", "c#": "C#", "c++": "C++",
  golang: "Go", linux: "Linux", macos: "macOS", android: "Android",
};
function normalizeSkillName(skill: string): string {
  return SKILL_NAMES[skill.toLowerCase().trim()] ?? skill;
}

// ── Category visual config ────────────────────────────────────────────────────
interface CatCfg { Icon: LucideIcon; bar: string; iconBg: string; iconText: string }

const CAT_CFG: Record<string, CatCfg> = {
  technical:         { Icon: Code2,        bar: "from-violet-500 to-indigo-500",  iconBg: "bg-violet-50 dark:bg-violet-950/30",   iconText: "text-violet-950 dark:text-violet-300"  },
  behavioral:        { Icon: MessageSquare, bar: "from-emerald-500 to-teal-500",  iconBg: "bg-emerald-50 dark:bg-emerald-950/30", iconText: "text-emerald-950 dark:text-emerald-300" },
  situational:       { Icon: Compass,       bar: "from-amber-500 to-orange-500",  iconBg: "bg-amber-50 dark:bg-amber-950/30",    iconText: "text-amber-950 dark:text-amber-300"    },
  "problem-solving": { Icon: Bug,           bar: "from-blue-500 to-cyan-500",     iconBg: "bg-blue-50 dark:bg-blue-950/30",      iconText: "text-blue-950 dark:text-blue-300"      },
  "system-design":   { Icon: Network,       bar: "from-indigo-500 to-purple-500", iconBg: "bg-indigo-50 dark:bg-indigo-950/30",  iconText: "text-indigo-950 dark:text-indigo-300"  },
};
const CAT_CFG_FALLBACK: CatCfg = {
  Icon: Layers,
  bar: "from-gray-400 to-slate-400",
  iconBg: "bg-gray-50 dark:bg-gray-800",
  iconText: "text-gray-500 dark:text-gray-400",
};

function getCatCfg(key: string): CatCfg {
  return CAT_CFG[key] ?? CAT_CFG[key.replace(/-/g, "")] ?? CAT_CFG_FALLBACK;
}

/** "problem-solving" → "problemSolving" for nested i18n key lookup */
function toCamelKey(k: string) {
  return k.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
}

// ── Match score arc ───────────────────────────────────────────────────────────
function MatchScoreArc({ percent, label }: { percent: number; label: string }) {
  const [drawn, setDrawn] = useState(false);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = drawn ? circ * (1 - Math.min(percent, 100) / 100) : circ;

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const arcCls =
    percent >= 80 ? "stroke-emerald-500 dark:stroke-emerald-400" :
    percent >= 55 ? "stroke-violet-500 dark:stroke-violet-400" :
                   "stroke-amber-500 dark:stroke-amber-400";
  const valCls =
    percent >= 80 ? "text-emerald-600 dark:text-emerald-400" :
    percent >= 55 ? "text-violet-600 dark:text-violet-400" :
                   "text-amber-600 dark:text-amber-400";

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="relative w-[64px] h-[64px]">
        <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90" fill="none" aria-hidden="true">
          <circle cx="28" cy="28" r={r} strokeWidth="4.5" className="stroke-gray-100 dark:stroke-gray-800" />
          <circle
            cx="28" cy="28" r={r} strokeWidth="4.5" strokeLinecap="round"
            className={cn(arcCls, "transition-[stroke-dashoffset] duration-700 ease-out")}
            strokeDasharray={circ}
            style={{ strokeDashoffset: offset }}
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-[14px] font-extrabold tabular-nums", valCls)}>
          {percent}%
        </span>
      </div>
      <span className={cn("text-[10px] font-semibold", portalSubtextAlt)}>{label}</span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function SetDetail({ set }: SetDetailProps) {
  const { t } = useLanguage();
  const p = t.jobseekerSetDetailPage;
  const mp = t.jobseekerMarketplacePage;
  const { addToast } = useToast();
  const router = useRouter();

  const [inProgressSessionId, setInProgressSessionId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [startNewConfirmOpen, setStartNewConfirmOpen] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [unpublishedDialogOpen, setUnpublishedDialogOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [planVisible, setPlanVisible] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    findInProgressSession(set.id)
      .then((found) => { if (!cancelled) setInProgressSessionId(found?.sessionId ?? null); })
      .catch(() => {});
    getBookmarkedSetIds().then((ids) => { if (!cancelled) setBookmarked(ids.has(set.id)); });
    return () => { cancelled = true; };
  }, [set.id]);

  useEffect(() => {
    const el = planRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setPlanVisible(true); obs.disconnect(); } },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function handleToggleBookmark() {
    if (bookmarking) return;
    setBookmarking(true);
    toggleBookmark(set.id)
      .then(setBookmarked)
      .catch(() => addToast("error", mp.bookmarkFailed))
      .finally(() => setBookmarking(false));
  }

  async function checkAndNavigate(destination: string) {
    if (navigating) return;
    setNavigating(true);
    try {
      await getQuestionSetById(set.id);
      router.push(destination);
    } catch (err) {
      setNavigating(false);
      if (err instanceof NotFoundError) setUnpublishedDialogOpen(true);
      else addToast("error", p.loadFailed);
    }
  }

  async function handleStartNew() {
    if (!inProgressSessionId || startingNew) return;
    setStartingNew(true);
    try {
      await getQuestionSetById(set.id);
    } catch (err) {
      setStartingNew(false);
      setStartNewConfirmOpen(false);
      if (err instanceof NotFoundError) setUnpublishedDialogOpen(true);
      else addToast("error", p.loadFailed);
      return;
    }
    abandonPracticeSession(inProgressSessionId)
      .then(() => { router.push(`/candidate/practice/${set.id}`); })
      .catch(async () => {
        const existing = await getPracticeSession(inProgressSessionId).catch(() => null);
        if (existing && existing.status !== "IN_PROGRESS") {
          router.push(`/candidate/practice/${set.id}`);
          return;
        }
        setStartingNew(false);
        setStartNewConfirmOpen(false);
        addToast("error", p.startNewFailed);
      });
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const estimatedTimeDisplay = fmtEstimatedTime(set.estimatedTime, mp) ?? set.estimatedTime ?? "";
  const difficultyLabel: string =
    ({ Easy: mp.easy, Medium: mp.medium, Hard: mp.hard } as Record<string, string>)[set.difficulty] ?? set.difficulty;
  const questionGroups = groupQuestionsForInterviewPlan(set.questions);
  const lockedCount = set.questions.filter((q) => q.isLocked).length;
  const isSingleCategory = questionGroups.length === 1;

  const catNames = p.categoryNames as Record<string, string>;
  const catDescs = p.categoryDescs as Record<string, string>;
  function getCatName(key: string) { return catNames[toCamelKey(key)] ?? catNames[key] ?? key; }
  function getCatDesc(key: string) { return catDescs[toCamelKey(key)] ?? catDescs[key] ?? ""; }

  const lastCompletedDate = set.myLastCompletedAt
    ? new Date(set.myLastCompletedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : null;

  const heroSkillsMax = 3;
  const heroSkills = set.skills.slice(0, heroSkillsMax);
  const heroSkillsMore = set.skills.length - heroSkillsMax;
  const practiceUrl = `/candidate/practice/${set.id}`;

  // ── Shared CTA render ─────────────────────────────────────────────────────
  function renderCTA() {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={navigating}
          onClick={() => void checkAndNavigate(practiceUrl)}
          className={cn(
            "shimmer-button group flex items-center justify-center gap-2 w-full h-12",
            "text-[14px] font-semibold text-white hr-cta-btn rounded-xl",
            "transition-transform duration-150 hover:-translate-y-px active:scale-[0.985]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900",
            "disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100",
          )}
        >
          {navigating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : inProgressSessionId ? (
            <>
              <RotateCcw size={14} />
              {p.summaryCard.continueBtn}
            </>
          ) : (
            <>
              {p.summaryCard.startBtn}
              <ChevronRight size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </>
          )}
        </button>
        {inProgressSessionId && (
          <button
            type="button"
            onClick={() => setStartNewConfirmOpen(true)}
            disabled={startingNew}
            className={cn(
              "flex items-center justify-center gap-2 w-full h-9 text-[13px] font-semibold rounded-xl",
              "border transition-colors disabled:opacity-60",
              portalMutedBg, portalHeadingAlt,
              "hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700",
            )}
          >
            {startingNew ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {p.startOverLabel}
          </button>
        )}
      </div>
    );
  }

  // ── Readiness Panel ───────────────────────────────────────────────────────
  function renderReadinessPanel() {
    const stats = [
      { val: `${set.totalQuestions}`,                                          label: p.summaryCard.totalQuestions },
      { val: estimatedTimeDisplay || "—",                                       label: p.summaryCard.estimatedTime  },
      { val: difficultyLabel,                                                   label: p.summaryCard.difficulty     },
      { val: set.attempts !== undefined ? String(set.attempts) : "—",          label: p.platformAttempts           },
    ] as const;

    return (
      <div className="hr-glass-card overflow-hidden">
        {/* Panel header */}
        <div className={cn("px-5 py-3 border-b flex items-center gap-2", portalDivider)}>
          <div className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-violet-500 to-indigo-600 shrink-0" />
          <p className={cn("text-[13px] font-bold", portalHeadingAlt)}>{p.readinessPanelTitle}</p>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Match score — only when real API data exists */}
          {set.matchPercent !== null && set.matchPercent !== undefined && (
            <div className="flex justify-center pb-1">
              <MatchScoreArc percent={set.matchPercent} label={p.matchCv} />
            </div>
          )}

          {/* 2×2 stat grid with dividers — no heavy grey boxes */}
          <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
            {stats.map(({ val, label }, i) => (
              <div
                key={label}
                className={cn(
                  "px-3.5 py-3",
                  i < 2 && "border-b border-gray-100 dark:border-gray-700",
                  i % 2 === 0 && "border-r border-gray-100 dark:border-gray-700",
                )}
              >
                <p className={cn("text-[15px] font-extrabold tabular-nums leading-tight", portalHeadingAlt)}>{val}</p>
                <p className={cn("text-[10px] mt-0.5 leading-tight", portalSubtextAlt)}>{label}</p>
              </div>
            ))}
          </div>

          {/* Previous attempt (only shown when real score data exists) */}
          {set.myLastScore !== null && set.myLastScore !== undefined && (
            <div className={cn("flex items-center justify-between border-t pt-3", portalDivider)}>
              <span className={cn("text-[12px]", portalSubtextAlt)}>{p.previousPerformanceTitle}</span>
              <span className={cn("text-[15px] font-extrabold tabular-nums", portalHeadingAlt)}>
                {set.myLastScore}
                <span className={cn("text-[11px] font-normal ml-0.5", portalSubtextAlt)}>/100</span>
                {lastCompletedDate && (
                  <span className={cn("text-[10px] font-normal ml-1.5", portalSubtextAlt)}>· {lastCompletedDate}</span>
                )}
              </span>
            </div>
          )}

          {/* In-progress notice */}
          {inProgressSessionId && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40 px-3 py-2">
              <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300">{p.activeSessionBadge}</p>
              <p className="text-[11px] text-violet-600/70 dark:text-violet-400/70 mt-0.5">{p.activeSessionHint}</p>
            </div>
          )}

          {renderCTA()}

          {/* After-session AI hint — smaller, set off from the button */}
          <p className={cn("text-[10px] text-center leading-snug mt-1", portalSubtextAlt)}>
            {p.beforeItems.aiEvaluation}
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Back link */}
      <Link
        href="/candidate"
        className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium hover:text-primary transition-colors mb-5", portalSubtextAlt)}
      >
        <ArrowLeft size={14} />
        {p.backToSets}
      </Link>

      {/* ── Compact Hero ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[20px] border border-violet-100 dark:border-violet-900/30 bg-gradient-to-br from-white to-violet-50/40 dark:from-gray-950 dark:to-indigo-950/40 mb-5"
      >
        {/* Intentional radial glow — larger coverage makes the right breathing room feel designed */}
        <div
          className="absolute right-0 top-0 w-[400px] h-[360px] rounded-full pointer-events-none opacity-[0.12] dark:opacity-[0.08]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,1) 0%, transparent 68%)", transform: "translate(30%, -20%)" }}
        />
        {/* Ghost dot grid — barely perceptible, reads as texture only */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.02]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(139,92,246,0.4) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative px-5 pt-3.5 pb-2.5 md:px-6 md:pt-4">
          {/* Row 1: eyebrow + bookmark */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <BrainCircuit size={12} className="text-violet-500 dark:text-violet-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.11em] text-violet-600 dark:text-violet-400">
                {p.interviewBriefingLabel}
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={bookmarking}
              aria-label={bookmarked ? mp.unsaveBtn : mp.saveBtn}
              title={bookmarked ? mp.unsaveBtn : mp.saveBtn}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-lg border transition-all disabled:opacity-60",
                bookmarked
                  ? "bg-primary/10 dark:bg-primary/15 border-primary/30 text-primary"
                  : "bg-white/70 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-primary hover:border-primary/30",
              )}
            >
              {bookmarking ? <Loader2 size={14} className="animate-spin" /> : <Bookmark size={14} className={bookmarked ? "fill-primary" : ""} />}
            </button>
          </div>

          {/* Row 2: company identity */}
          <div className="flex items-center gap-2.5 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={logoError ? "fb" : "primary"}
              src={(!logoError && set.companyLogoUrl?.trim()) ? set.companyLogoUrl! : "/images/logo.png"}
              alt={set.company ?? "logo"}
              onError={(e) => {
                if (!logoError) { setLogoError(true); return; }
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              className="w-8 h-8 rounded-lg object-contain shrink-0 border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-900/80 p-0.5"
            />
            <button
              type="button"
              onClick={() => setShowCompanyModal(true)}
              className={cn("text-[12px] font-medium hover:text-primary transition-colors", portalSubtextAlt)}
            >
              {set.company}
            </button>
          </div>

          {/* Row 3: title */}
          <h1 className={cn("text-[20px] sm:text-[23px] font-extrabold leading-[1.2] mb-2.5", portalHeadingAlt)}>
            {cleanTitle(set.title)}
          </h1>

          {/* Row 4: difficulty + skills */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            <DifficultyPill difficulty={set.difficulty} label={difficultyLabel} className="text-[11px] px-2.5 py-0.5" />
            {heroSkills.map((skill) => (
              <span
                key={skill}
                className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 text-gray-600 dark:text-gray-400"
              >
                {normalizeSkillName(skill)}
              </span>
            ))}
            {heroSkillsMore > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
                +{heroSkillsMore}
              </span>
            )}
          </div>

          {/* Row 5: meta row + optional real-data cluster on the right */}
          <div className="flex items-end justify-between gap-3">
            {/* Meta pills — separated by "·" */}
            <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px]", portalSubtextAlt)}>
              <span className="flex items-center gap-1">
                <BarChart2 size={12} className="text-primary/70" />
                {set.totalQuestions} {p.questions}
              </span>
              {estimatedTimeDisplay && (
                <>
                  <span className="opacity-30">·</span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-primary/70" />
                    {estimatedTimeDisplay}
                  </span>
                </>
              )}
              {set.attempts !== undefined && (
                <>
                  <span className="opacity-30">·</span>
                  <span className="flex items-center gap-1">
                    <Users size={12} className="text-primary/70" />
                    {set.attempts.toLocaleString()} {p.platformAttempts}
                  </span>
                </>
              )}
              {set.rating !== undefined && (
                <>
                  <span className="opacity-30">·</span>
                  <span className="flex items-center gap-1" title={p.ratingTooltip}>
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className={cn("font-semibold", portalHeadingAlt)}>{set.rating!.toFixed(1)}</span>
                    <span className="opacity-60">/5</span>
                  </span>
                </>
              )}
            </div>
            {/* Compact data cluster — only rendered when real API data exists */}
            {((set.matchPercent !== null && set.matchPercent !== undefined) ||
              (set.myLastScore !== null && set.myLastScore !== undefined)) && (
              <div className="flex items-center gap-3 shrink-0 self-end pb-0.5">
                {set.matchPercent !== null && set.matchPercent !== undefined && (
                  <div className="text-right">
                    <p className="text-[15px] font-extrabold tabular-nums leading-tight text-violet-600 dark:text-violet-400">
                      {set.matchPercent}%
                    </p>
                    <p className={cn("text-[10px] leading-tight", portalSubtextAlt)}>{p.matchCv}</p>
                  </div>
                )}
                {set.myLastScore !== null && set.myLastScore !== undefined && (
                  <div className="text-right">
                    <p className="text-[15px] font-extrabold tabular-nums leading-tight text-emerald-600 dark:text-emerald-400">
                      {set.myLastScore}
                    </p>
                    <p className={cn("text-[10px] leading-tight", portalSubtextAlt)}>{p.lastScore}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Body grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_304px] gap-5 items-start">

        {/* ── Left: unified overview card — order-2 on mobile (panel first) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.06 }}
          className="order-2 lg:order-1 hr-glass-card overflow-hidden"
        >
          {/* ── Section: Interview Structure ─────────────────────────────── */}
          <div className={cn("px-5 py-3.5 border-b", portalDivider)}>
            <p className={cn("text-[14px] font-bold", portalHeadingAlt)}>{p.interviewPlanTitle}</p>
            <p className={cn("text-[11px] mt-0.5", portalSubtextAlt)}>{p.interviewPlanSub}</p>
          </div>

          <div ref={planRef} className="px-5 py-3 flex flex-col gap-0">
            {questionGroups.length === 0 ? (
              <p className={cn("text-[13px] text-center py-3", portalSubtextAlt)}>{p.noSkillsListed}</p>
            ) : isSingleCategory ? (
              /* ── Single category: compact two-line inline, no bar needed ── */
              <div className="flex items-start justify-between gap-4 py-2">
                <div className="min-w-0">
                  <p className={cn("text-[13px] font-semibold leading-tight", portalHeadingAlt)}>
                    {getCatName(questionGroups[0].key)}
                  </p>
                  <p className={cn("text-[11px] leading-snug mt-0.5", portalSubtextAlt)}>
                    {getCatDesc(questionGroups[0].key)}
                  </p>
                </div>
                <span className={cn("shrink-0 text-[12px] font-medium tabular-nums whitespace-nowrap pt-0.5 opacity-70", portalSubtextAlt)}>
                  {questionGroups[0].count}/{set.totalQuestions} {p.questions} · 100%
                </span>
              </div>
            ) : (() => {
              /* ── Multiple categories: icon + index + animated bar ── */
              // Shimmer cascade constants:
              // Each bar's fill animation completes at roughly (480 + idx*70 + idx*60) ms.
              // We wait for the slowest bar, then cascade the shimmer sweep top→bottom.
              const n = questionGroups.length;
              const SHIMMER_MS = 1400;          // duration of one sweep across a bar
              const GAP_MS = 400;               // pause between consecutive sweeps
              const CYCLE_MS = n * (SHIMMER_MS + GAP_MS) + 200; // full loop period
              const SWEEP_PCT = +((SHIMMER_MS / CYCLE_MS) * 100).toFixed(2);
              // Approx time when the LAST bar finishes its fill animation:
              const FILL_DONE = 480 + (n - 1) * 70 + (n - 1) * 60 + 240;

              return (
                <>
                  <style>{`
                    @keyframes sd-bar-shimmer {
                      0%            { transform: translateX(-150%); opacity: 1; }
                      ${SWEEP_PCT - 0.05}% { transform: translateX(450%);  opacity: 1; }
                      ${SWEEP_PCT}%  { transform: translateX(450%);  opacity: 0; }
                      100%          { transform: translateX(450%);  opacity: 0; }
                    }
                  `}</style>
                  {questionGroups.map((group, idx) => {
                    const { Icon, bar, iconBg, iconText } = getCatCfg(group.key);
                    // Each bar's shimmer is offset by idx * (SHIMMER_MS + GAP_MS) within the cycle
                    const shimmerDelay = FILL_DONE + idx * (SHIMMER_MS + GAP_MS);
                    return (
                      <div
                        key={group.key}
                        className={cn("flex items-start gap-3 py-3", idx > 0 && "border-t border-gray-100 dark:border-gray-800")}
                      >
                        {/* Index */}
                        <span className={cn("text-[10px] font-bold w-4 shrink-0 pt-0.5 tabular-nums", portalSubtextAlt)}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        {/* Icon */}
                        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", iconBg)}>
                          <Icon size={13} className={iconText} />
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <div className="min-w-0">
                              <p className={cn("text-[13px] font-semibold leading-tight", portalHeadingAlt)}>
                                {getCatName(group.key)}
                              </p>
                              <p className={cn("text-[11px] leading-snug", portalSubtextAlt)}>
                                {getCatDesc(group.key)}
                              </p>
                            </div>
                            <span className={cn("shrink-0 text-[12px] font-bold tabular-nums whitespace-nowrap", portalHeadingAlt)}>
                              {group.count} {p.questions}
                            </span>
                          </div>
                          {/* Animated progress bar + shimmer sweep */}
                          <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={cn("relative h-full bg-linear-to-r rounded-full transition-[width] ease-out overflow-hidden", bar)}
                              style={{
                                width: planVisible ? `${group.percentage}%` : "0%",
                                transitionDuration: `${480 + idx * 70}ms`,
                                transitionDelay: planVisible ? `${idx * 60}ms` : "0ms",
                              }}
                            >
                              {/* Shimmer light — cascades bar 1 → 2 → 3 … in sequence */}
                              <span
                                aria-hidden
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.55) 50%,transparent 100%)",
                                  animation: planVisible
                                    ? `sd-bar-shimmer ${CYCLE_MS}ms linear ${shimmerDelay}ms infinite`
                                    : "none",
                                }}
                              />
                            </div>
                          </div>
                          <span className={cn("text-[10px] tabular-nums", portalSubtextAlt)}>
                            {group.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>

          {/* ── Section: Key Skills (single row + overflow chip) ─────────── */}
          {set.skills.length > 0 && (
            <div className={cn("px-5 py-3 border-t", portalDivider)}>
              <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden">
                {/* Label */}
                <span className={cn("text-[10px] font-bold uppercase tracking-wider shrink-0 pr-1", portalSubtextAlt)}>
                  {p.skillsTitle}
                </span>
                {/* Visible skills — capped so the row stays single-line */}
                {(() => {
                  const MAX = 5;
                  const visible = set.skills.slice(0, MAX);
                  const extra = set.skills.length - MAX;
                  return (
                    <>
                      {visible.map((skill) => {
                        const si = getSkillIcon(skill);
                        const SI = si?.icon;
                        return (
                          <span
                            key={skill}
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-medium h-7 px-2.5 rounded-md shrink-0 max-w-36 truncate",
                              portalMutedBg, portalHeadingAlt,
                            )}
                          >
                            {SI && <SI size={12} className={cn("shrink-0", si.className)} />}
                            <span className="truncate">{normalizeSkillName(skill)}</span>
                          </span>
                        );
                      })}
                      {extra > 0 && (
                        <span className={cn(
                          "inline-flex items-center text-[11px] font-semibold h-7 px-2.5 rounded-md shrink-0",
                          "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
                        )}>
                          +{extra}
                        </span>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Section: Before You Start ────────────────────────────────── */}
          <div className={cn("px-5 pt-3 pb-4 border-t", portalDivider)}>
            <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1.5", portalSubtextAlt)}>
              {p.beforeYouStartTitle}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {estimatedTimeDisplay && (
                <div className="flex items-center gap-2">
                  <Clock size={12} className="shrink-0 text-primary" />
                  <span className={cn("text-[12px] leading-snug", portalSubtextAlt)}>
                    {p.beforeItems.timeAdvice.replace("{{time}}", estimatedTimeDisplay)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="shrink-0 text-primary" />
                <span className={cn("text-[12px] leading-snug", portalSubtextAlt)}>
                  {p.beforeItems.answerAuthentically}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BrainCircuit size={12} className="shrink-0 text-primary" />
                <span className={cn("text-[12px] leading-snug", portalSubtextAlt)}>
                  {p.beforeItems.aiEvaluation}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="shrink-0 text-primary" />
                <span className={cn("text-[12px] leading-snug", portalSubtextAlt)}>
                  {p.beforeItems.progressSaved}
                </span>
              </div>
              {lockedCount > 0 && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Lock size={12} className="shrink-0 text-amber-500 dark:text-amber-400" />
                  <span className="text-[12px] leading-snug font-medium text-amber-700 dark:text-amber-300">
                    {p.beforeItems.premiumLocked.replace("{{count}}", String(lockedCount))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Right: Readiness Panel — order-1 on mobile ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.04 }}
          className="order-1 lg:order-2 lg:sticky lg:top-6"
        >
          {renderReadinessPanel()}
        </motion.div>
      </div>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      {showCompanyModal && set.company && (
        <CompanyModal name={set.company} logoUrl={set.companyLogoUrl} onClose={() => setShowCompanyModal(false)} />
      )}

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

      {unpublishedDialogOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/40">
              <EyeOff size={26} className="text-amber-500 dark:text-amber-400" />
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-2">
              {p.unpublishedDialogTitle}
            </h3>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              {p.unpublishedDialogBody}
            </p>
            <button
              type="button"
              onClick={() => router.push("/candidate/practice")}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft size={14} />
              {p.unpublishedDialogBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
