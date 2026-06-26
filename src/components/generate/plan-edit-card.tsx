"use client";

import { useState } from "react";
import {
  ClipboardList,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  portalHeading,
  portalSubtext,
  portalInput,
  portalBanner,
  portalDivider,
} from "@/lib/portal-ui";
import type { PlanDraft, QuestionType } from "@/types/generation-session";
import { useLanguage } from "@/context/language-context";

const ALL_TYPES: QuestionType[] = [
  "Technical",
  "Behavioral",
  "Situational",
  "System-design",
  "Problem-solving",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const EXPERIENCE_LEVELS = [
  "Intern",
  "Junior",
  "Mid-level",
  "Senior",
  "Lead",
  "Manager",
];

interface PlanEditCardProps {
  plan: PlanDraft;
  aiMessage?: string;
  isApproving: boolean;
  onPlanChange: (plan: PlanDraft) => void;
  onApprove: () => void;
  onRetryPlan: () => void;
  onBack: () => void;
}

export function PlanEditCard({
  plan,
  aiMessage,
  isApproving,
  onPlanChange,
  onApprove,
  onRetryPlan,
  onBack,
}: PlanEditCardProps) {
  const { t } = useLanguage();
  const pec = t.planEditCard;
  const [topicsText, setTopicsText] = useState(() => plan.topics.join(", "));
  const [touched, setTouched] = useState({ role: false });

  function update<K extends keyof PlanDraft>(key: K, value: PlanDraft[K]) {
    onPlanChange({ ...plan, [key]: value });
  }

  function handleTopicsChange(text: string) {
    setTopicsText(text);
    const topics = text
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    update("topics", topics);
  }

  function toggleType(type: QuestionType) {
    const next = plan.questionTypes.includes(type)
      ? plan.questionTypes.filter((t) => t !== type)
      : [...plan.questionTypes, type];
    update("questionTypes", next.length ? next : [type]);
  }

  const errors = {
    role: !plan.role.trim(),
  };
  const canApprove =
    !isApproving &&
    !errors.role &&
    plan.questionCount >= 1 &&
    plan.questionCount <= 50;

  function handleApprove() {
    setTouched({ role: true });
    if (canApprove) onApprove();
  }

  const displayMessage = aiMessage || plan.summary;

  return (
    <div className="hr-glass-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
          <ClipboardList size={18} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h3 className={cn("text-base font-semibold", portalHeading)}>
            {pec.heading}
          </h3>
          <p className={cn("text-sm", portalSubtext)}>
            {pec.subtext}
          </p>
        </div>
      </div>

      {/* AI insight */}
      {displayMessage && (
        <div className={cn("rounded-xl border p-4", portalBanner)}>
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="text-violet-500 mt-0.5 shrink-0" />
            <div>
              <p className={cn("text-xs font-semibold mb-1", portalHeading)}>
                {pec.aiInsight}
              </p>
              <p className={cn("text-sm leading-relaxed", portalSubtext)}>
                {displayMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Editable fields */}
      <div className="space-y-4">
        {/* Role + Difficulty + Experience */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>
              {pec.roleLabel} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={plan.role}
              onChange={(e) => { update("role", e.target.value); setTouched(t => ({ ...t, role: true })); }}
              onBlur={() => setTouched(t => ({ ...t, role: true }))}
              placeholder={pec.rolePlaceholder}
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors",
                touched.role && errors.role
                  ? "border-red-400 dark:border-red-600 focus:ring-red-200 dark:focus:ring-red-900 focus:border-red-400 bg-red-50/30 dark:bg-red-950/10"
                  : "focus:ring-primary/20 focus:border-primary",
                portalInput
              )}
            />
            {touched.role && errors.role && (
              <p className="flex items-center gap-1 text-xs text-red-500 font-medium">
                <AlertCircle size={11} /> {pec.roleRequired}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>
              {pec.difficultyLabel}
            </label>
            <select
              value={plan.difficulty ?? ""}
              onChange={(e) => update("difficulty", e.target.value)}
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                portalInput
              )}
            >
              <option value="">{pec.difficultyPlaceholder}</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>
              {pec.experienceLabel}
            </label>
            <select
              value={plan.level}
              onChange={(e) => update("level", e.target.value)}
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
                portalInput
              )}
            >
              <option value="">{pec.experiencePlaceholder}</option>
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Question Count */}
        <div className="space-y-1.5">
          <label className={cn("text-sm font-medium", portalHeading)}>
            {pec.questionCountLabel}{" "}
            <span className={cn("text-xs font-normal", portalSubtext)}>
              (1 – 50)
            </span>
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={plan.questionCount}
            onChange={(e) =>
              update(
                "questionCount",
                Math.min(50, Math.max(1, Number(e.target.value) || 1))
              )
            }
            className={cn(
              "w-28 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
              portalInput
            )}
          />
        </div>

        {/* Question Types */}
        <div className="space-y-2">
          <label className={cn("text-sm font-medium", portalHeading)}>
            {pec.questionTypesLabel}
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.map((type) => {
              const selected = plan.questionTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={cn(
                    "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                    selected
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-primary hover:text-primary"
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-1.5">
          <label className={cn("text-sm font-medium", portalHeading)}>
            {pec.skillsLabel}{" "}
            <span className={cn("text-xs font-normal", portalSubtext)}>
              {pec.skillsSeparator}
            </span>
          </label>
          <textarea
            value={topicsText}
            onChange={(e) => handleTopicsChange(e.target.value)}
            placeholder={pec.skillsPlaceholder}
            rows={3}
            className={cn(
              "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
              portalInput
            )}
          />
        </div>

        {/* Constraints */}
        <div className="space-y-1.5">
          <label className={cn("text-sm font-medium", portalHeading)}>
            {pec.constraintsLabel}{" "}
            <span className={cn("text-xs font-normal", portalSubtext)}>
              {pec.constraintsOptional}
            </span>
          </label>
          <textarea
            value={plan.constraints ?? ""}
            onChange={(e) => update("constraints", e.target.value)}
            placeholder={pec.constraintsPlaceholder}
            rows={2}
            className={cn(
              "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors",
              portalInput
            )}
          />
        </div>
      </div>

      {/* Actions */}
      <div className={cn("border-t pt-5 space-y-3", portalDivider)}>
        {/* Validation summary */}
        {touched.role && errors.role && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={13} className="shrink-0" />
            <span>{pec.missingFieldsPre}{pec.roleLabel}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            disabled={isApproving}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 transition-colors",
              portalHeading,
              "hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            )}
          >
            <ArrowLeft size={14} />
            {pec.backBtn}
          </button>

          <button
            type="button"
            onClick={onRetryPlan}
            disabled={isApproving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={14} />
            {pec.retryPlanBtn}
          </button>

          <button
            type="button"
            onClick={handleApprove}
            disabled={isApproving}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors",
              canApprove
                ? "shimmer-button hr-cta-btn text-white"
                : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            )}
          >
            {isApproving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {pec.approvingBtn}
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                {pec.approveBtn}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
