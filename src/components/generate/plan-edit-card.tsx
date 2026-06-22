"use client";

import { useState } from "react";
import {
  ClipboardList,
  RotateCcw,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  portalCard,
  portalHeading,
  portalSubtext,
  portalInput,
  portalBanner,
  portalDivider,
} from "@/lib/portal-ui";
import type { PlanDraft, QuestionType } from "@/types/generation-session";

const ALL_TYPES: QuestionType[] = [
  "Technical",
  "Behavioral",
  "Situational",
  "Competency-based",
];

const LEVELS = [
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
  const [topicsText, setTopicsText] = useState(() => plan.topics.join(", "));

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

  const canApprove =
    !isApproving &&
    plan.role.trim() !== "" &&
    plan.level !== "" &&
    plan.questionCount >= 1;

  const displayMessage = aiMessage || plan.summary;

  return (
    <div className={cn(portalCard, "shadow-sm p-6 space-y-5")}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
          <ClipboardList size={18} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h3 className={cn("text-base font-semibold", portalHeading)}>
            Kế hoạch phỏng vấn
          </h3>
          <p className={cn("text-sm", portalSubtext)}>
            AI đã đề xuất kế hoạch bên dưới. Chỉnh sửa nếu cần rồi Approve để tạo câu hỏi.
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
                Nhận xét từ AI
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
        {/* Role + Level */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>
              Vị trí <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={plan.role}
              onChange={(e) => update("role", e.target.value)}
              placeholder="VD: Frontend Developer"
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
                portalInput
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className={cn("text-sm font-medium", portalHeading)}>
              Cấp độ <span className="text-red-500">*</span>
            </label>
            <select
              value={plan.level}
              onChange={(e) => update("level", e.target.value)}
              className={cn(
                "w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
                portalInput
              )}
            >
              <option value="">Chọn cấp độ...</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Question Count */}
        <div className="space-y-1.5">
          <label className={cn("text-sm font-medium", portalHeading)}>
            Số câu hỏi{" "}
            <span className={cn("text-xs font-normal", portalSubtext)}>
              (1 – 30)
            </span>
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={plan.questionCount}
            onChange={(e) =>
              update(
                "questionCount",
                Math.min(30, Math.max(1, Number(e.target.value) || 1))
              )
            }
            className={cn(
              "w-28 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
              portalInput
            )}
          />
        </div>

        {/* Question Types */}
        <div className="space-y-2">
          <label className={cn("text-sm font-medium", portalHeading)}>
            Loại câu hỏi
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
                      ? "bg-[#6c47ff] text-white border-[#6c47ff]"
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#6c47ff] hover:text-[#6c47ff]"
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        {/* Topics */}
        <div className="space-y-1.5">
          <label className={cn("text-sm font-medium", portalHeading)}>
            Chủ đề{" "}
            <span className={cn("text-xs font-normal", portalSubtext)}>
              (ngăn cách bằng dấu phẩy)
            </span>
          </label>
          <textarea
            value={topicsText}
            onChange={(e) => handleTopicsChange(e.target.value)}
            placeholder="VD: React hooks, State management, Performance optimization"
            rows={3}
            className={cn(
              "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
              portalInput
            )}
          />
        </div>

        {/* Constraints */}
        <div className="space-y-1.5">
          <label className={cn("text-sm font-medium", portalHeading)}>
            Ghi chú / Ràng buộc{" "}
            <span className={cn("text-xs font-normal", portalSubtext)}>
              (tùy chọn)
            </span>
          </label>
          <textarea
            value={plan.constraints ?? ""}
            onChange={(e) => update("constraints", e.target.value)}
            placeholder="Yêu cầu đặc biệt, ngôn ngữ phỏng vấn, v.v."
            rows={2}
            className={cn(
              "w-full resize-none rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6c47ff]/20 focus:border-[#6c47ff] transition-colors",
              portalInput
            )}
          />
        </div>
      </div>

      {/* Actions */}
      <div className={cn("border-t pt-5 flex gap-3", portalDivider)}>
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
          Quay lại
        </button>

        <button
          type="button"
          onClick={onRetryPlan}
          disabled={isApproving}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={14} />
          Tạo lại Plan
        </button>

        <button
          type="button"
          onClick={onApprove}
          disabled={!canApprove}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#6c47ff] text-white hover:bg-[#5535dd] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isApproving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Đang xác nhận...
            </>
          ) : (
            <>
              <CheckCircle2 size={14} />
              Approve Plan
            </>
          )}
        </button>
      </div>
    </div>
  );
}
