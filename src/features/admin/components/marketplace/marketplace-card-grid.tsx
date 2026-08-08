"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Clock,
  Users,
  Star,
  ChevronRight,
  BarChart2,
  Pin,
  PinOff,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { DifficultyPill } from "@/features/candidate/components/ui/pill";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { getCompanyColor, getCompanyInitials } from "@/features/candidate/utils/company-visual";
import type { Difficulty } from "@/features/candidate/types/jobseeker";
import type { AdminMarketplaceListItem } from "@/features/admin/services/admin-marketplace.service";

const MAX_VISIBLE = 3;
const skillTag =
  "min-w-0 truncate bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-800/30 text-[11px] font-medium px-2.5 py-1 rounded-md";

function normalizeDifficulty(raw?: string | null): Difficulty {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "easy") return "Easy";
  if (v === "hard") return "Hard";
  return "Medium";
}

function SkillsPopover({
  skills,
  anchorRef,
  onClose,
}: {
  skills: string[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (anchorRef.current) setRect(anchorRef.current.getBoundingClientRect());
  }, [anchorRef]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      )
        return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [anchorRef, onClose]);

  if (!mounted || !rect) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{ top: rect.bottom + 6, left: rect.left }}
      className="fixed z-9999 flex max-w-55 flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-white p-3 shadow-xl animate-fade-up dark:border-gray-700 dark:bg-gray-900"
    >
      {skills.map((skill) => (
        <span key={skill} className={skillTag}>
          {skill}
        </span>
      ))}
    </div>,
    document.body
  );
}

export interface AdminMarketplaceSetCardLabels {
  badgePinned: string;
  badgeTrending: string;
  questions: string;
  estimatedTimePrefix: string;
  attempts: string;
  ratingTooltip: string;
  viewDetail: string;
  pin: string;
  unpin: string;
  hrPrefix: string;
}

interface AdminMarketplaceSetCardProps {
  item: AdminMarketplaceListItem;
  pinning: boolean;
  selected?: boolean;
  labels: AdminMarketplaceSetCardLabels;
  onView: (id: string) => void;
  onTogglePin: (item: AdminMarketplaceListItem) => void;
}

export function AdminMarketplaceSetCard({
  item,
  pinning,
  selected,
  labels,
  onView,
  onTogglePin,
}: AdminMarketplaceSetCardProps) {
  const [showSkills, setShowSkills] = useState(false);
  const skillsBtnRef = useRef<HTMLButtonElement>(null);

  const skills = item.skills ?? [];
  const visibleSkills = skills.slice(0, MAX_VISIBLE);
  const extraCount = skills.length - MAX_VISIBLE;
  const difficulty = normalizeDifficulty(item.difficulty);
  const companyColor = getCompanyColor(item.companyName || item.id);
  const companyInitials = getCompanyInitials(item.companyName || item.title);
  const estimatedTime = item.estimatedTimeMinutes
    ? `${Math.round(item.estimatedTimeMinutes)} min`
    : `${Math.max(1, item.totalQuestions * 3)} min`;

  return (
    <div
      className={cn(
        "hr-glass-card group flex h-full flex-col overflow-hidden",
        selected && "ring-2 ring-primary/40"
      )}
    >
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          {item.companyLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.companyLogo}
              alt={item.companyName}
              loading="lazy"
              decoding="async"
              className="h-10 w-10 shrink-0 rounded-lg border border-gray-100 object-cover dark:border-gray-700"
            />
          ) : (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white",
                companyColor
              )}
            >
              {companyInitials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {item.isPinned ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <Pin size={10} />
                  {labels.badgePinned}
                </span>
              ) : null}
              {item.isTrending ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <TrendingUp size={10} />
                  {labels.badgeTrending}
                </span>
              ) : null}
            </div>
            <h3 className={cn("line-clamp-2 text-[14px] font-[700] leading-[20px]", portalHeadingAlt)}>
              {item.title}
            </h3>
            <p className={cn("mt-0.5 text-[12px]", portalSubtextAlt)}>{item.companyName}</p>
            <p className={cn("mt-0.5 truncate text-[11px]", portalSubtextAlt)}>
              {labels.hrPrefix}: {item.hrName}
            </p>
          </div>

          <DifficultyPill difficulty={difficulty} label={difficulty} />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(item);
            }}
            disabled={pinning}
            title={item.isPinned ? labels.unpin : labels.pin}
            aria-label={item.isPinned ? labels.unpin : labels.pin}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
              item.isPinned
                ? "border-amber-300/50 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-gray-200 bg-gray-50 text-gray-500 hover:border-primary/30 hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            )}
          >
            {pinning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : item.isPinned ? (
              <PinOff size={14} />
            ) : (
              <Pin size={14} />
            )}
          </button>
        </div>

        {item.description ? (
          <p className={cn("line-clamp-2 text-[13px] leading-[20px]", portalSubtextAlt)}>
            {item.description}
          </p>
        ) : null}

        <div className="flex items-center gap-1.5">
          {visibleSkills.map((skill) => (
            <span key={skill} className={skillTag} style={{ maxWidth: "7rem" }}>
              {skill}
            </span>
          ))}
          {extraCount > 0 ? (
            <button
              ref={skillsBtnRef}
              type="button"
              onClick={() => setShowSkills((v) => !v)}
              className="shrink-0 cursor-pointer rounded-md border border-gray-200 bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              +{extraCount}
            </button>
          ) : null}
          {showSkills ? (
            <SkillsPopover skills={skills} anchorRef={skillsBtnRef} onClose={() => setShowSkills(false)} />
          ) : null}
        </div>

        <div className={cn("flex items-center gap-4 text-[12px]", portalSubtextAlt)}>
          <span className="flex items-center gap-1">
            <BarChart2 size={12} className="shrink-0" />
            {item.totalQuestions} {labels.questions}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} className="shrink-0" />
            {labels.estimatedTimePrefix}
            {estimatedTime}
          </span>
          <span className="ml-auto flex items-center gap-1" title={labels.attempts}>
            <Users size={12} className="shrink-0" />
            {item.attemptCount.toLocaleString()} {labels.attempts}
          </span>
        </div>

        {item.rating != null ? (
          <div className="flex items-center gap-1.5" title={labels.ratingTooltip}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                className={
                  star <= Math.round(item.rating!)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
                }
              />
            ))}
            <span className={cn("ml-1 text-[12px] font-[600]", portalHeadingAlt)}>
              {item.rating.toFixed(1)}
            </span>
            <span className={cn("text-[11px]", portalSubtextAlt)}>/ 5</span>
          </div>
        ) : null}
      </div>

      <div className="px-6 pb-5">
        <button
          type="button"
          onClick={() => onView(item.id)}
          className="shimmer-button hr-cta-btn flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[14px] font-semibold text-white"
        >
          {labels.viewDetail}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

interface AdminMarketplaceCardGridProps {
  items: AdminMarketplaceListItem[];
  loading: boolean;
  selectedId: string | null;
  pinningId: string | null;
  emptyLabel: string;
  setsFoundLabel: string;
  totalCount: number;
  cardLabels: AdminMarketplaceSetCardLabels;
  onView: (id: string) => void;
  onTogglePin: (item: AdminMarketplaceListItem) => void;
}

export function AdminMarketplaceCardGrid({
  items,
  loading,
  selectedId,
  pinningId,
  emptyLabel,
  setsFoundLabel,
  totalCount,
  cardLabels,
  onView,
  onTogglePin,
}: AdminMarketplaceCardGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={22} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <p className={cn("rounded-xl border border-dashed px-4 py-12 text-center text-sm", portalSubtextAlt)}>
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className={cn("text-[13px]", portalSubtextAlt)}>
        <span className={cn("font-semibold", portalHeadingAlt)}>{totalCount}</span> {setsFoundLabel}
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <AdminMarketplaceSetCard
            key={item.id}
            item={item}
            pinning={pinningId === item.id}
            selected={selectedId === item.id}
            labels={cardLabels}
            onView={onView}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    </div>
  );
}
