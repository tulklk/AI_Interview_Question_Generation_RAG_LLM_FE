"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  ListOrdered,
  Map,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { portalHeadingAlt, portalSubtextAlt } from "@/shared/utils/portal-ui";
import { useLanguage } from "@/shared/providers/language-context";
import { fillTemplate } from "@/features/candidate/utils/dashboard-analytics";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";
import type { CoachRoadmap, CoachRoadmapItem } from "@/features/candidate/services/coach.service";
import {
  expandVariants,
  staggerContainer,
  staggerItem,
} from "@/features/candidate/components/coach/coach-motion";
import { CoachStepHeader } from "@/features/candidate/components/coach/coach-step-header";

interface CoachRoadmapPreviewPanelProps {
  roadmaps: CoachRoadmap[];
  busy?: boolean;
  accepting?: boolean;
  onToggleItem: (itemId: string, isIncluded: boolean) => void | Promise<void>;
  onUpdateDraft: (payload: {
    items?: Array<{ itemId: string; isIncluded?: boolean; sortOrder?: number }>;
    roadmaps?: Array<{ roadmapId: string; displayOrder: number }>;
  }) => void | Promise<void>;
  onAccept: () => void | Promise<void>;
  /** Kỹ năng CV chưa được đo (vượt giới hạn bài chẩn đoán) — nhắc làm bài sàng lọc để lộ trình đủ skill. */
  unmeasuredSkills?: string[];
  startingScreening?: boolean;
  onStartScreening?: () => void;
}

function priorityLabel(
  priority: string,
  labels: { high: string; medium: string; low: string }
): string {
  const key = priority.toLowerCase();
  if (key === "high") return labels.high;
  if (key === "low") return labels.low;
  return labels.medium;
}

function learnTopics(items: CoachRoadmapItem[]): CoachRoadmapItem[] {
  return items
    .filter((i) => !i.isReassessmentGate)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Checkbox skill-level: tick ngoài để bật/tắt nhanh mọi topic trong skill. */
function SkillIncludeCheckbox({
  checked,
  indeterminate,
  disabled,
  ariaLabel,
  onToggle,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  ariaLabel: string;
  onToggle: (next: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/40 disabled:opacity-40"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        e.stopPropagation();
        onToggle(e.target.checked);
      }}
    />
  );
}

function SortableTopicRow({
  item,
  disabled,
  toggling,
  onToggle,
}: {
  item: CoachRoadmapItem;
  disabled: boolean;
  toggling: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const checked = item.isIncluded !== false;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50/80 dark:hover:bg-gray-900/30",
        isDragging && "z-10 bg-white shadow-md dark:bg-gray-900"
      )}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab touch-none text-gray-400 active:cursor-grabbing disabled:opacity-40"
        disabled={disabled}
        aria-label="Drag"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <input
        type="checkbox"
        className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-primary focus:ring-primary/40"
        checked={checked}
        disabled={disabled || toggling}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={item.topic}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[12px] font-medium leading-snug",
            checked ? portalHeadingAlt : "text-gray-400 line-through"
          )}
        >
          {item.topic}
        </p>
      </div>
      {toggling && <Loader2 size={12} className="shrink-0 animate-spin text-primary" />}
    </div>
  );
}

/** SCRUM-462 / SCRUM-484: preview + toggle + sắp xếp thứ tự luyện trước Accept. */
export function CoachRoadmapPreviewPanel({
  roadmaps,
  busy = false,
  accepting = false,
  onToggleItem,
  onUpdateDraft,
  onAccept,
  unmeasuredSkills = [],
  startingScreening = false,
  onStartScreening,
}: CoachRoadmapPreviewPanelProps) {
  const { t } = useLanguage();
  const p = t.jobseekerCoachPage;
  const reduced = useReducedMotion();
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [pendingSkillId, setPendingSkillId] = useState<string | null>(null);
  const [togglingAll, setTogglingAll] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [descExpanded, setDescExpanded] = useState<Record<string, boolean>>({});
  const locked = busy || accepting || reordering || pendingSkillId !== null || togglingAll;

  const draftRoadmaps = useMemo(
    () =>
      roadmaps
        .filter((r) => r.status === "Suggested" && !r.acceptedAt)
        .slice()
        .sort(
          (a, b) =>
            (a.displayOrder ?? 0) - (b.displayOrder ?? 0) ||
            b.priorityScore - a.priorityScore
        ),
    [roadmaps]
  );

  const defaultExpandedId = useMemo(() => {
    if (draftRoadmaps.length === 0) return null;
    return draftRoadmaps[0].id;
  }, [draftRoadmaps]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const activeExpandedId = expandedId ?? defaultExpandedId;

  const summary = useMemo(() => {
    let skills = 0;
    let topics = 0;
    for (const r of draftRoadmaps) {
      const included = r.items.filter((i) => !i.isReassessmentGate && i.isIncluded !== false);
      if (included.length > 0) {
        skills += 1;
        topics += included.length;
      }
    }
    return { skills, topics };
  }, [draftRoadmaps]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (draftRoadmaps.length === 0) return null;

  const canAccept = summary.skills >= 1 && !locked;
  const learnItems = draftRoadmaps.flatMap((roadmap) => learnTopics(roadmap.items));
  const allSelected = learnItems.length > 0 && learnItems.every((item) => item.isIncluded !== false);
  const noneSelected = learnItems.every((item) => item.isIncluded === false);

  async function handleToggle(itemId: string, next: boolean) {
    setPendingItemId(itemId);
    try {
      await onToggleItem(itemId, next);
    } finally {
      setPendingItemId(null);
    }
  }

  /** Tick ngoài skill: batch bật/tắt toàn bộ topic học của skill đó. */
  async function handleToggleSkill(roadmap: CoachRoadmap, next: boolean) {
    const topics = learnTopics(roadmap.items);
    if (topics.length === 0) return;
    setPendingSkillId(roadmap.id);
    try {
      await onUpdateDraft({
        items: topics.map((item) => ({
          itemId: item.id,
          isIncluded: next,
        })),
      });
    } finally {
      setPendingSkillId(null);
    }
  }

  async function handleToggleAllSkills(next: boolean) {
    const items = draftRoadmaps.flatMap((roadmap) =>
      learnTopics(roadmap.items).map((item) => ({
        itemId: item.id,
        isIncluded: next,
      }))
    );
    if (items.length === 0) return;
    setTogglingAll(true);
    try {
      await onUpdateDraft({ items });
    } finally {
      setTogglingAll(false);
    }
  }

  async function persistSkillOrder(ordered: CoachRoadmap[]) {
    setReordering(true);
    try {
      await onUpdateDraft({
        roadmaps: ordered.map((r, idx) => ({ roadmapId: r.id, displayOrder: idx })),
      });
    } finally {
      setReordering(false);
    }
  }

  async function moveSkill(roadmapId: string, dir: -1 | 1) {
    const idx = draftRoadmaps.findIndex((r) => r.id === roadmapId);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= draftRoadmaps.length) return;
    const ordered = arrayMove(draftRoadmaps, idx, nextIdx);
    await persistSkillOrder(ordered);
  }

  async function persistTopicOrder(roadmap: CoachRoadmap, orderedTopics: CoachRoadmapItem[]) {
    setReordering(true);
    try {
      await onUpdateDraft({
        items: orderedTopics.map((item, idx) => ({
          itemId: item.id,
          sortOrder: idx + 1,
          isIncluded: item.isIncluded !== false,
        })),
      });
    } finally {
      setReordering(false);
    }
  }

  async function moveTopic(roadmap: CoachRoadmap, itemId: string, dir: -1 | 1) {
    const topics = learnTopics(roadmap.items);
    const idx = topics.findIndex((t) => t.id === itemId);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= topics.length) return;
    await persistTopicOrder(roadmap, arrayMove(topics, idx, nextIdx));
  }

  async function onTopicDragEnd(roadmap: CoachRoadmap, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const topics = learnTopics(roadmap.items);
    const oldIndex = topics.findIndex((t) => t.id === active.id);
    const newIndex = topics.findIndex((t) => t.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    await persistTopicOrder(roadmap, arrayMove(topics, oldIndex, newIndex));
  }

  const priorityLabels = {
    high: p.priorityHighLabel,
    medium: p.priorityMediumLabel,
    low: p.priorityLowLabel,
  };

  return (
    <div className="hr-glass-card relative">
      <CoachStepHeader
        icon={Map}
        title={p.roadmapPreviewTitle}
        subtitle={p.roadmapPreviewSubtitle}
        iconWrapClassName="bg-violet-100 dark:bg-violet-950/50"
        iconClassName="text-violet-600 dark:text-violet-400"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
          {fillTemplate(p.roadmapPreviewSummary, {
            skills: String(summary.skills),
            topics: String(summary.topics),
          })}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={locked || allSelected}
            onClick={() => void handleToggleAllSkills(true)}
            className="text-[12px] font-semibold text-primary disabled:opacity-40"
          >
            {p.roadmapSelectAllSkills}
          </button>
          <button
            type="button"
            disabled={locked || noneSelected}
            onClick={() => void handleToggleAllSkills(false)}
            className="text-[12px] font-semibold text-primary disabled:opacity-40"
          >
            {p.roadmapDeselectAllSkills}
          </button>
        </div>
      </div>

      {unmeasuredSkills.length > 0 && (
        <div className="space-y-2 border-b border-amber-100 bg-amber-50/60 px-5 py-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
            {fillTemplate(p.roadmapUnmeasuredTitle, { count: String(unmeasuredSkills.length) })}
          </p>
          <p className={cn("text-[11px] leading-snug", portalSubtextAlt)}>{unmeasuredSkills.join(", ")}</p>
          {onStartScreening && (
            <button
              type="button"
              disabled={startingScreening}
              onClick={() => onStartScreening()}
              className="hr-cta-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {startingScreening && <Loader2 size={13} className="animate-spin" />}
              {p.screeningCta}
            </button>
          )}
        </div>
      )}

      {/* SCRUM-484: phần Thứ tự luyện đặt trước / nổi bật */}
      <div className="border-b border-violet-100 bg-violet-50/40 px-5 py-3 dark:border-violet-900/40 dark:bg-violet-950/20">
        <div className="mb-2 flex items-center gap-2">
          <ListOrdered size={14} className="text-violet-600 dark:text-violet-400" />
          <div>
            <p className={cn("text-[12px] font-semibold", portalHeadingAlt)}>
              {p.roadmapPracticeOrderTitle}
            </p>
            <p className={cn("text-[11px]", portalSubtextAlt)}>{p.roadmapPracticeOrderHint}</p>
          </div>
          {reordering && <Loader2 size={12} className="ml-auto animate-spin text-primary" />}
        </div>
        <ol className="space-y-1.5">
          {draftRoadmaps.map((roadmap, idx) => (
            <li
              key={`order-${roadmap.id}`}
              className="flex items-center gap-2 rounded-lg border border-violet-100/80 bg-white/80 px-2.5 py-1.5 dark:border-violet-900/40 dark:bg-gray-950/40"
            >
              <span className="w-5 shrink-0 text-center text-[11px] font-bold tabular-nums text-violet-600 dark:text-violet-400">
                {idx + 1}
              </span>
              <p className={cn("min-w-0 flex-1 truncate text-[12px] font-medium", portalHeadingAlt)}>
                {roadmap.skill}
              </p>
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  disabled={locked || idx === 0}
                  onClick={() => void moveSkill(roadmap.id, -1)}
                  className="rounded p-1 text-gray-500 hover:bg-violet-100 disabled:opacity-30 dark:hover:bg-violet-950/50"
                  aria-label={p.roadmapMoveSkillUp}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  type="button"
                  disabled={locked || idx === draftRoadmaps.length - 1}
                  onClick={() => void moveSkill(roadmap.id, 1)}
                  className="rounded p-1 text-gray-500 hover:bg-violet-100 disabled:opacity-30 dark:hover:bg-violet-950/50"
                  aria-label={p.roadmapMoveSkillDown}
                >
                  <ArrowDown size={12} />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {draftRoadmaps.map((roadmap) => {
          const expanded = activeExpandedId === roadmap.id;
          const si = getSkillIcon(roadmap.skill);
          const SIcon = si?.icon;
          const outside = roadmap.skillSource === "outsideCv";
          const topics = learnTopics(roadmap.items);
          const topicCount = topics.filter((i) => i.isIncluded !== false).length;
          const allTopicsIncluded = topics.length > 0 && topicCount === topics.length;
          const someTopicsIncluded = topicCount > 0 && topicCount < topics.length;
          const skillToggling = pendingSkillId === roadmap.id;
          const desc = roadmap.explanation?.trim() || (outside ? roadmap.outsideCvReason : null);
          const showFullDesc = descExpanded[roadmap.id];
          const longDesc = Boolean(desc && desc.length > 120);

          return (
            <div key={roadmap.id}>
              <div className="flex w-full items-center gap-2.5 px-5 py-3.5 hover:bg-gray-50/80 dark:hover:bg-gray-900/40">
                <SkillIncludeCheckbox
                  checked={allTopicsIncluded}
                  indeterminate={someTopicsIncluded}
                  disabled={locked || topics.length === 0}
                  ariaLabel={fillTemplate(p.roadmapToggleSkill, { skill: roadmap.skill })}
                  onToggle={(next) => void handleToggleSkill(roadmap, next)}
                />
                {skillToggling && (
                  <Loader2 size={12} className="shrink-0 animate-spin text-primary" />
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : roadmap.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                    {SIcon ? <SIcon size={16} className={si.className} /> : <Map size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "text-[14px] font-bold",
                          topicCount > 0 ? portalHeadingAlt : "text-gray-400 line-through"
                        )}
                      >
                        {roadmap.skill}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          outside
                            ? "bg-amber-50 text-amber-700/80 dark:bg-amber-950/30 dark:text-amber-200/70"
                            : "bg-emerald-50 text-emerald-700/80 dark:bg-emerald-950/30 dark:text-emerald-200/70"
                        )}
                      >
                        {outside ? p.roadmapSkillOutsideCv : p.roadmapSkillFromCv}
                      </span>
                      {(roadmap.confidence ?? "").toLowerCase() === "screening" && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                          {p.roadmapScreeningBadge}
                        </span>
                      )}
                    </div>
                    <p className={cn("mt-0.5 text-[11px]", portalSubtextAlt)}>
                      {fillTemplate(p.roadmapPreviewTopicCount, { count: String(topicCount) })}
                      {" · "}
                      {fillTemplate(p.roadmapPreviewPriorityLine, {
                        priority: priorityLabel(roadmap.priority, priorityLabels),
                        score: roadmap.priorityScore.toFixed(1),
                      })}
                    </p>
                  </div>
                  {expanded ? (
                    <ChevronDown size={16} className="shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-gray-400" />
                  )}
                </button>
              </div>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="body"
                    className="overflow-hidden"
                    variants={expandVariants}
                    initial={reduced ? false : "collapsed"}
                    animate="expanded"
                    exit="exit"
                  >
                    <div className="space-y-3 px-5 pb-4 sm:pl-16">
                      {desc && (
                        <div>
                          <p
                            className={cn(
                              "text-[11px] leading-relaxed",
                              portalSubtextAlt,
                              !showFullDesc && longDesc && "line-clamp-2"
                            )}
                          >
                            {desc}
                          </p>
                          {longDesc && (
                            <button
                              type="button"
                              onClick={() =>
                                setDescExpanded((prev) => ({
                                  ...prev,
                                  [roadmap.id]: !prev[roadmap.id],
                                }))
                              }
                              className="mt-0.5 text-[11px] font-semibold text-primary hover:underline"
                            >
                              {showFullDesc ? p.roadmapShowLess : p.roadmapShowMore}
                            </button>
                          )}
                        </div>
                      )}

                      <p className={cn("text-[11px] font-semibold", portalSubtextAlt)}>
                        {p.roadmapTopicOrderHint}
                      </p>

                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => void onTopicDragEnd(roadmap, e)}
                      >
                        <SortableContext
                          items={topics.map((t) => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <motion.ul
                            className="space-y-1.5"
                            variants={staggerContainer}
                            initial={reduced ? false : "hidden"}
                            animate="visible"
                          >
                            {topics.map((item, tIdx) => {
                              const toggling = pendingItemId === item.id;
                              return (
                                <motion.li key={item.id} variants={staggerItem} className="list-none">
                                  <div className="flex items-center gap-1">
                                    <div className="min-w-0 flex-1">
                                      <SortableTopicRow
                                        item={item}
                                        disabled={locked}
                                        toggling={toggling}
                                        onToggle={(next) => void handleToggle(item.id, next)}
                                      />
                                    </div>
                                    <div className="flex shrink-0 flex-col gap-0.5 pr-1">
                                      <button
                                        type="button"
                                        disabled={locked || tIdx === 0}
                                        onClick={() => void moveTopic(roadmap, item.id, -1)}
                                        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                                        aria-label={p.roadmapMoveTopicUp}
                                      >
                                        <ArrowUp size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={locked || tIdx === topics.length - 1}
                                        onClick={() => void moveTopic(roadmap, item.id, 1)}
                                        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800"
                                        aria-label={p.roadmapMoveTopicDown}
                                      >
                                        <ArrowDown size={11} />
                                      </button>
                                    </div>
                                  </div>
                                </motion.li>
                              );
                            })}
                          </motion.ul>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[12px] font-semibold tabular-nums", portalHeadingAlt)}>
              {fillTemplate(p.roadmapAcceptBarSummary, {
                skills: String(summary.skills),
                topics: String(summary.topics),
              })}
            </p>
            {!canAccept && summary.skills === 0 && (
              <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                {p.roadmapAcceptMinOneSkill}
              </p>
            )}
          </div>
          <button
            type="button"
            disabled={!canAccept}
            onClick={() => void onAccept()}
            className="shimmer-button hr-cta-btn inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {accepting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {p.roadmapAcceptCta}
          </button>
        </div>
      </div>
    </div>
  );
}
