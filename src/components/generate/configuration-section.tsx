"use client";

import { Sparkles, CheckCircle2, Hash } from "lucide-react";
import { SelectField } from "@/components/ui/select-field";
import { jobRoles, experienceLevels, questionCounts } from "@/data/generate";
import { useLanguage } from "@/context/language-context";

interface ConfigurationSectionProps {
  role: string;
  level: string;
  questionCount: string;
  jdText: string;
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
  onRoleChange,
  onLevelChange,
  onCountChange,
  onSubmit,
}: ConfigurationSectionProps) {
  const { t } = useLanguage();
  const cfg = t.generatePage.config;

  const isReady = jdText.trim().length >= 30 && role !== "" && level !== "";

  const selectedRole = jobRoles.find((r) => r.id === role);
  const selectedLevel = experienceLevels.find((l) => l.id === level);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-[#6c47ff]" />
        <h2 className="text-base font-semibold text-gray-900">{cfg.title}</h2>
      </div>

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
          <label htmlFor="question-count" className="text-sm font-medium text-gray-700">
            {cfg.questionsPerCategory}
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
              <Hash size={12} className="text-gray-400" />
            </div>
            <SelectField
              value={questionCount}
              onChange={onCountChange}
              options={questionCounts.map((q) => ({ value: String(q.value), label: q.label }))}
              id="question-count"
            />
          </div>
          <p className="text-[11px] text-gray-400">{cfg.helperText}</p>
        </div>
      </div>

      {isReady && (
        <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
          <CheckCircle2 size={15} className="text-[#6c47ff] mt-0.5 shrink-0" />
          <p className="text-sm text-indigo-700">
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
        disabled={!isReady}
        className="w-full flex items-center justify-center gap-2 bg-[#6c47ff] hover:bg-[#5535dd] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-3.5 rounded-lg transition-colors"
      >
        <Sparkles size={15} />
        {cfg.generateBtn}
      </button>
    </div>
  );
}
