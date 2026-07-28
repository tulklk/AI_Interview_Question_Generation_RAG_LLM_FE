"use client";

import { useState } from "react";
import type {
  GenerationRun,
  StudioQuestion,
  StudioQuestionDifficulty,
  StudioQuestionType,
} from "@/features/studio/types/studio.types";
import { cn } from "@/lib/cn";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";

interface Props {
  questions: StudioQuestion[];
  generationRun?: GenerationRun | null;
  isGenerating?: boolean;
  onRefreshStatus?: () => void | Promise<void>;
  onUpdateQuestion: (question: StudioQuestion) => Promise<void> | void;
  onDeleteQuestion: (questionId: string) => Promise<void> | void;
  onRegenerateQuestion: (questionId: string) => Promise<void> | void;
}

function statusBannerClass(status?: string) {
  if (status === "Completed") return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
  if (status === "Failed" || status === "Cancelled") return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100";
  if (status === "Generating" || status === "Pending") return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
  return "border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100";
}

export function QuestionsTab({
  questions,
  generationRun,
  isGenerating,
  onRefreshStatus,
  onUpdateQuestion,
  onDeleteQuestion,
  onRegenerateQuestion,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  return (
    <div className={cn(portalCard, "p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={cn("text-sm font-semibold", portalHeading)}>Questions ({questions.length})</h3>
        {onRefreshStatus && (
          <button
            type="button"
            onClick={() => void onRefreshStatus()}
            className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Làm mới trạng thái
          </button>
        )}
      </div>

      {(generationRun || isGenerating) && (
        <div className={cn("mt-3 rounded-lg border p-3 text-xs", statusBannerClass(generationRun?.status))}>
          <p className="font-medium">
            {isGenerating && generationRun?.status !== "Completed" && generationRun?.status !== "Failed"
              ? "Đang sinh câu hỏi (RAG async)…"
              : `Job: ${generationRun?.status ?? "—"}`}
          </p>
          {generationRun && (
            <p className={cn("mt-1", portalSubtext)}>
              Run {generationRun.id.slice(0, 8)}… • yêu cầu {generationRun.requestedQuestionCount}q
              {generationRun.generatedQuestionCount > 0 ? ` • đã tạo ${generationRun.generatedQuestionCount}` : ""}
            </p>
          )}
          {generationRun?.status === "Failed" && (
            <p className="mt-2 font-medium text-red-700 dark:text-red-300">
              [{generationRun.errorCode ?? "FAILED"}] {generationRun.errorMessage || "Không có chi tiết lỗi."}
            </p>
          )}
          {generationRun?.status === "Generating" && !isGenerating && (
            <p className="mt-2">
              Job vẫn Generating — RAG có thể chưa callback BE. Bấm Làm mới hoặc kiểm tra deploy BE/RAG.
            </p>
          )}
          {questions.length === 0 && generationRun?.status === "Completed" && (
            <p className="mt-2">Run Completed nhưng list rỗng — thử Làm mới hoặc Generate lại.</p>
          )}
        </div>
      )}

      {questions.length === 0 && !generationRun && !isGenerating && (
        <p className={cn("mt-3 text-sm", portalSubtext)}>
          Chưa có câu hỏi. Approve plan rồi bấm Generate Interview Questions.
        </p>
      )}

      <div className="mt-3 space-y-2">
        {questions.map((question) => (
          <div key={question.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className={cn("text-xs", portalSubtext)}>
                #{question.orderIndex + 1} • {question.type} • {question.difficulty}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(question.id);
                    setDraftText(question.content);
                  }}
                  className="text-xs text-indigo-600"
                >
                  Edit
                </button>
                <button type="button" onClick={() => onRegenerateQuestion(question.id)} className="text-xs text-amber-600">
                  Regenerate
                </button>
                <button type="button" onClick={() => onDeleteQuestion(question.id)} className="text-xs text-red-600">
                  Delete
                </button>
              </div>
            </div>
            {editingId === question.id ? (
              <div className="space-y-2">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-200 p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingId(null)} className="rounded border px-2 py-1 text-xs">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await onUpdateQuestion({
                        ...question,
                        content: draftText,
                        difficulty: question.difficulty as StudioQuestionDifficulty,
                        type: question.type as StudioQuestionType,
                      });
                      setEditingId(null);
                    }}
                    className="rounded bg-[#6c47ff] px-2 py-1 text-xs text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-800 dark:text-gray-100">{question.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
