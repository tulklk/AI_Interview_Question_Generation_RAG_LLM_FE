"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ANCHOR_KEYS, type RubricV1 } from "../types";
import { buildPresetCriteria, getPresetKey, listPresetOptions } from "../presets";
import { isPublishReady, rebalanceWeights } from "../validators";
import { emptyRubric, rubricToApiPayload } from "../normalize";

export interface RubricEditorLabels {
  title: string;
  presetHint: string;
  applyPreset: string;
  weightLabel: string;
  anchorsTitle: string;
  readyBadge: string;
  notReadyBadge: string;
  sumHint: (sum: number) => string;
}

const DEFAULT_LABELS: RubricEditorLabels = {
  title: "Tiêu chí chấm theo mức",
  presetHint: "Chọn khung tiêu chí theo loại câu",
  applyPreset: "Áp dụng khung mặc định",
  weightLabel: "Trọng số",
  anchorsTitle: "Mốc chấm",
  readyBadge: "Sẵn sàng publish",
  notReadyBadge: "Chưa đủ tiêu chí",
  sumHint: (sum) => `Tổng trọng số: ${sum}% (cần 100%)`,
};

export interface RubricEditorProps {
  value: RubricV1;
  onChange: (next: RubricV1) => void;
  questionType?: string | null;
  contentMode?: "theory" | "code" | "system_design" | null;
  disabled?: boolean;
  compact?: boolean;
  labels?: Partial<RubricEditorLabels>;
  className?: string;
}

export function RubricEditor({
  value,
  onChange,
  questionType,
  contentMode,
  disabled = false,
  compact = false,
  labels: labelsOverride,
  className,
}: RubricEditorProps) {
  const labels = { ...DEFAULT_LABELS, ...labelsOverride };
  const presetKey = getPresetKey(questionType, contentMode);
  const presetOptions = useMemo(() => listPresetOptions(presetKey), [presetKey]);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>(
    () => presetOptions.map((o) => o.id)
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const weightSum = value.criteria.reduce((a, c) => a + c.weight, 0);
  const ready = isPublishReady(value);

  const applyPreset = () => {
    const criteria = buildPresetCriteria(presetKey, selectedPresetIds);
    onChange({ ...value, criteria });
  };

  const togglePresetId = (id: string) => {
    setSelectedPresetIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next.length > 0 ? next : prev;
    });
  };

  const updateWeight = (id: string, newWeight: number) => {
    const weights = rebalanceWeights(value.criteria, id, newWeight);
    onChange({
      ...value,
      criteria: value.criteria.map((c, i) => ({ ...c, weight: weights[i] ?? c.weight })),
    });
  };

  const updateAnchor = (criterionId: string, anchorKey: string, text: string) => {
    onChange({
      ...value,
      criteria: value.criteria.map((c) =>
        c.id === criterionId
          ? { ...c, anchors: { ...c.anchors, [anchorKey]: text } }
          : c
      ),
    });
  };

  const updateLabel = (criterionId: string, label: string) => {
    onChange({
      ...value,
      criteria: value.criteria.map((c) => (c.id === criterionId ? { ...c, label } : c)),
    });
  };

  if (value.criteria.length === 0) {
    return (
      <div className={cn("rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/30", className)}>
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{labels.title}</p>
        <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300">{labels.presetHint}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {presetOptions.map((opt) => (
            <label key={opt.id} className="flex items-center gap-1 text-[11px]">
              <input
                type="checkbox"
                checked={selectedPresetIds.includes(opt.id)}
                disabled={disabled}
                onChange={() => togglePresetId(opt.id)}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={applyPreset}
          className="mt-2 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-50"
        >
          {labels.applyPreset}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-amber-200/70 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/30", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{labels.title}</p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            ready
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
          )}
        >
          {ready ? labels.readyBadge : labels.notReadyBadge}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{labels.sumHint(weightSum)}</p>

      <div className="mt-2 space-y-2">
        {value.criteria.map((c) => (
          <div key={c.id} className="rounded-md border border-amber-100 bg-white/60 p-2 dark:border-amber-900/50 dark:bg-gray-950/40">
            <div className="flex flex-wrap items-center gap-2">
              {!compact ? (
                <input
                  type="text"
                  value={c.label}
                  disabled={disabled}
                  onChange={(e) => updateLabel(c.id, e.target.value)}
                  className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900"
                />
              ) : (
                <span className="flex-1 text-xs font-medium text-gray-800 dark:text-gray-100">{c.label}</span>
              )}
              <label className="flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-300">
                {labels.weightLabel}
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={disabled}
                  value={c.weight}
                  onChange={(e) => updateWeight(c.id, Number(e.target.value))}
                  className="w-14 rounded border border-gray-200 px-1 py-0.5 text-xs dark:border-gray-700 dark:bg-gray-900"
                />
                %
              </label>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setExpandedId((prev) => (prev === c.id ? null : c.id))}
                className="text-[10px] text-amber-800 underline dark:text-amber-300"
              >
                {expandedId === c.id ? "Ẩn mốc" : labels.anchorsTitle}
              </button>
            </div>
            {expandedId === c.id && (
              <div className="mt-2 space-y-1.5 border-t border-amber-100 pt-2 dark:border-amber-900/40">
                {ANCHOR_KEYS.map((key) => (
                  <div key={key} className="flex gap-2">
                    <span className="w-8 shrink-0 text-[10px] font-semibold text-amber-800 dark:text-amber-300">
                      {key}
                    </span>
                    <input
                      type="text"
                      disabled={disabled}
                      value={c.anchors[key] ?? ""}
                      onChange={(e) => updateAnchor(c.id, key, e.target.value)}
                      className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-[11px] dark:border-gray-700 dark:bg-gray-900"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => onChange(emptyRubric(value.level))}
          className="mt-2 text-[10px] text-gray-500 underline dark:text-gray-400"
        >
          Đặt lại khung
        </button>
      )}
    </div>
  );
}

/** Helper: chuẩn bị payload gửi BE. */
export function prepareRubricForSave(doc: RubricV1) {
  const normalized = rubricToApiPayload(doc);
  return {
    rubricJson: JSON.stringify(normalized),
    displayText: normalized.criteria.map((c) => `[${c.weight}%] ${c.label}`).join("\n"),
    ready: isPublishReady(normalized),
  };
}
