"use client";

import { Sparkles, CheckCircle2, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelectField } from "@/components/ui/select-field";
import { jobRoles, experienceLevels, questionCounts } from "@/data/generate";
import { useLanguage } from "@/context/language-context";
import { portalBanner, portalCard, portalHeading, portalSubtext } from "@/lib/portal-ui";

interface ConfigurationSectionProps {
  role: string;
  level: string;
  questionCount: string;
  jdText: string;
  maxQuestionsPerRun: number;
  generateDisabled?: boolean;
  onRoleChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onCountChange: (v: string) => void;
  onSubmit: () => void;
}

export function ConfigurationSection({
  role,
  level,
  questionCount,
  jdText,
  maxQuestionsPerRun,
  generateDisabled = false,
  onRoleChange,
  onLevelChange,
  onCountChange,
  onSubmit,
}: ConfigurationSectionProps) {
  const { t } = useLanguage();
  const cfg = t.generatePage.config;
  const hs = t.hrSubscription;

  const isReady = jdText.trim().length >= 30 && role !== "" && level !== "";

  const selectedRole = jobRoles.find((r) => r.id === role);
  const selectedLevel = experienceLevels.find((l) => l.id === level);

  const countOptions = questionCounts
    .filter((q) => q.value <= maxQuestionsPerRun)
    .map((q) => ({ value: String(q.value), label: q.label }));

  return (
    <div className={cn(portalCard, "shadow-sm p-6 space-y-5")}>
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-[#6c47ff]" />
        <h2 className={cn("text-base font-semibold", portalHeading)}>{cfg.title}</h2>
      </div>

      {maxQuestionsPerRun < 20 && (
        <p className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-lg px-3 py-2">
          {hs.lockedBatch.replace("{max}", String(maxQuestionsPerRun))}
        </p>
      )}

      <div className="grid grid-cols-3 gap-4">
        <SelectField
          label={cfg.jobRole}
          required
          value={role}
          onChange={onRoleChange}
          placeholder={cfg.jobRolePlaceholder}
          options={jobRoles.map((r) => ({ value: r.id, label: r.label }))}
          id="job-role"
        />

        <SelectField
          label={cfg.experienceLevel}
          required
          value={level}
          onChange={onLevelChange}
          placeholder={cfg.experienceLevelPlaceholder}
          options={experienceLevels.map((l) => ({ value: l.id, label: l.label }))}
          id="experience-level"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="question-count" className={cn("text-sm font-medium", portalHeading)}>
            {cfg.questionsPerCategory}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <Hash size={12} className="text-gray-400 dark:text-gray-500" />
            </div>
            <SelectField
              value={questionCount}
              onChange={onCountChange}
              options={countOptions}
              id="question-count"
            />
          </div>
          <p className={cn("text-[11px]", portalSubtext)}>{cfg.helperText}</p>
        </div>
      </div>

      {isReady && (
        <div className={cn("flex items-start gap-2.5 rounded-lg px-4 py-3", portalBanner)}>
          <CheckCircle2 size={15} className="text-[#6c47ff] mt-0.5 shrink-0" />
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            <span className="font-semibold">{cfg.readyBanner}</span>{" "}
            {cfg.aiWillCreate}{" "}
            <span className="font-semibold">
              {Number(questionCount) * 3} {cfg.questions}
            </span>{" "}
            {cfg.acrossCategories}{" "}
            <span className="font-semibold">{selectedLevel?.label.split(" (")[0]}</span>{" "}
            <span className="font-semibold">{selectedRole?.label}</span>{" "}
            {cfg.roleWord}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isReady || generateDisabled}
        className="w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-3.5 rounded-lg transition-colors"
      >
        <Sparkles size={15} />
        {cfg.generateBtn}
      </button>
    </div>
  );
}
