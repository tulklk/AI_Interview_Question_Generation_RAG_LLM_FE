"use client";

/**
 * SCRUM-397 v3: Question Builder — workspace soạn câu hỏi thủ công
 * đủ field như Studio Save (sampleAnswer, rubric, skill, focusArea, questionType).
 * Chọn/tạo bộ → Loại nội dung → Soạn → Preview → Lưu
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StudioCodeTemplateId } from "@/features/studio/constants/question-templates";
import type { DifficultyLevel, QuestionType } from "@/features/interview/types/generation-session";
import {
  addQuestionSetQuestion,
  createManualDraftQuestionSet,
  uploadQuestionSetQuestionImage,
} from "@/features/interview/services/interview.service";
import { listHistoryQuestionSets } from "@/features/hr/services/hr-history.service";
import type { HistoryQuestionSetItem } from "@/features/hr/types/history-question-set";
import { useToast } from "@/shared/providers/toast-context";
import { portalCard, portalHeading, portalSubtext } from "@/shared/utils/portal-ui";
import {
  QuestionBuilderSetPanel,
  type SessionAddedQuestion,
} from "@/features/interview/components/generate/question-builder-set-panel";
import {
  QuestionBuilderComposer,
  type ContentMode,
} from "@/features/interview/components/generate/question-builder-composer";
import { QuestionBuilderPreview } from "@/features/interview/components/generate/question-builder-preview";

const DEFAULT_SNIPPETS: Record<Exclude<StudioCodeTemplateId, "SYSTEM_DESIGN">, string> = {
  CODE_COMPLETION: "function twoSum(nums, target) {\n  // TODO\n}",
  BUG_DETECTION:
    "let total = 0;\nfor (let i = 0; i <= arr.length; i++) {\n  total += arr[i];\n}",
  REFACTORING:
    "if (user && user.profile && user.profile.name) {\n  return user.profile.name;\n}",
  TEST_CASE_DESIGN: "public int Divide(int a, int b)\n{\n  return a / b;\n}",
  PERFORMANCE_ANALYSIS:
    "orders\n  .Where(o => statuses.Any(s => s.OrderId == o.Id))\n  .ToList();",
};

const DEFAULT_IMAGE_HINTS: Record<StudioCodeTemplateId | "THEORY", string> = {
  THEORY: "Tìm hình ảnh hoặc diagram minh họa khái niệm chính trong câu hỏi.",
  CODE_COMPLETION: "Tìm ảnh screenshot đoạn code TODO hoặc whiteboard thuật toán.",
  BUG_DETECTION: "Tìm ảnh đoạn code lỗi (screenshot IDE) hoặc diagram bug flow.",
  REFACTORING: "Tìm ảnh code smell trước/sau hoặc slide clean-code.",
  TEST_CASE_DESIGN: "Tìm ảnh bảng test case / coverage matrix.",
  PERFORMANCE_ANALYSIS: "Tìm ảnh Big-O chart hoặc profiler screenshot.",
  SYSTEM_DESIGN: "Tìm sơ đồ kiến trúc / sequence từ Notion, Confluence, slide nội bộ.",
};

const STEPS = [
  { id: 1, label: "Chọn bộ" },
  { id: 2, label: "Chọn loại" },
  { id: 3, label: "Soạn" },
  { id: 4, label: "Lưu" },
] as const;

/** Flatten snippet giống Studio Save: \\n escape + ; → , để History infer. */
function flattenSnippetForRationale(snippet: string): string {
  return snippet
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\\n")
    .replace(/;/g, ",");
}

function parseRubricLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function defaultQuestionType(mode: ContentMode): QuestionType {
  if (mode === "system_design") return "System-design";
  if (mode === "code") return "Problem-solving";
  return "Technical";
}

function defaultTemplate(mode: ContentMode): StudioCodeTemplateId {
  if (mode === "system_design") return "SYSTEM_DESIGN";
  return "BUG_DETECTION";
}

export function QuestionBuilderPage() {
  const { addToast } = useToast();

  const [drafts, setDrafts] = useState<HistoryQuestionSetItem[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [selectedSetId, setSelectedSetId] = useState<string>("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creatingSet, setCreatingSet] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [contentMode, setContentMode] = useState<ContentMode>("code");
  const [selectedTemplate, setSelectedTemplate] = useState<StudioCodeTemplateId>("BUG_DETECTION");
  const [questionType, setQuestionType] = useState<QuestionType>("Problem-solving");
  const [question, setQuestion] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [snippetLanguage, setSnippetLanguage] = useState("auto");
  const [diagramDescription, setDiagramDescription] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("Medium");
  const [skill, setSkill] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [sampleAnswer, setSampleAnswer] = useState("");
  const [rubricText, setRubricText] = useState("");
  const [rationale, setRationale] = useState("");
  const [imageHint, setImageHint] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionAdded, setSessionAdded] = useState<SessionAddedQuestion[]>([]);

  const selectedSet = useMemo(
    () => drafts.find((d) => d.questionSetId === selectedSetId) ?? null,
    [drafts, selectedSetId]
  );

  const effectiveSnippet = useMemo(() => {
    if (contentMode !== "code") return "";
    if (codeSnippet.trim()) return codeSnippet;
    if (selectedTemplate === "SYSTEM_DESIGN") return "";
    return DEFAULT_SNIPPETS[selectedTemplate as Exclude<StudioCodeTemplateId, "SYSTEM_DESIGN">] ?? "";
  }, [contentMode, codeSnippet, selectedTemplate]);

  const rubricLines = useMemo(() => parseRubricLines(rubricText), [rubricText]);

  const imageHintKey: StudioCodeTemplateId | "THEORY" =
    contentMode === "theory"
      ? "THEORY"
      : contentMode === "system_design"
        ? "SYSTEM_DESIGN"
        : selectedTemplate;

  const activeStep = useMemo(() => {
    if (!selectedSetId) return 1;
    if (question.trim()) return 3;
    if (sessionAdded.length > 0) return 4;
    return 2;
  }, [selectedSetId, question, sessionAdded.length]);

  const loadDrafts = useCallback(async (preferId?: string) => {
    setLoadingDrafts(true);
    try {
      const items = await listHistoryQuestionSets();
      const onlyDraft = items.filter((x) => x.status === "DRAFT");
      setDrafts(onlyDraft);
      setSelectedSetId((prev) => {
        if (preferId && onlyDraft.some((d) => d.questionSetId === preferId)) return preferId;
        if (prev && onlyDraft.some((d) => d.questionSetId === prev)) return prev;
        return onlyDraft[0]?.questionSetId ?? "";
      });
      if (onlyDraft.length === 0) setShowCreateForm(true);
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const onContentModeChange = (mode: ContentMode) => {
    setContentMode(mode);
    setSelectedTemplate(defaultTemplate(mode));
    setQuestionType(defaultQuestionType(mode));
    if (mode !== "code") {
      setCodeSnippet("");
      setSnippetLanguage("auto");
    }
    if (mode !== "system_design") setDiagramDescription("");
  };

  const resetComposer = () => {
    setQuestion("");
    setCodeSnippet("");
    setSnippetLanguage("auto");
    setDiagramDescription("");
    setSampleAnswer("");
    setRubricText("");
    setRationale("");
    setImageHint("");
    setSkill("");
    setFocusArea("");
    setImageFile(null);
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
  };

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(file));
    setImageFile(file);
  };

  const onCreateSet = async () => {
    const title = newTitle.trim();
    if (!title) {
      addToast("error", "Vui lòng nhập tên bộ câu hỏi.");
      return;
    }
    setCreatingSet(true);
    try {
      const created = await createManualDraftQuestionSet({
        title,
        description: newDescription.trim() || undefined,
      });
      addToast("success", "Đã tạo bộ DRAFT mới.");
      setNewTitle("");
      setNewDescription("");
      setShowCreateForm(false);
      setSessionAdded([]);
      await loadDrafts(created.questionSetId);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "Không tạo được bộ câu hỏi.");
    } finally {
      setCreatingSet(false);
    }
  };

  /** Build rationale meta giống Studio Save snapshot. */
  const buildRationaleMeta = (): string | undefined => {
    const parts: string[] = [];
    const core = rationale.trim();
    if (core) parts.push(core);

    if (contentMode === "code" && selectedTemplate !== "SYSTEM_DESIGN") {
      parts.push(`template=${selectedTemplate}`);
      if (effectiveSnippet.trim()) {
        parts.push(`snippet=${flattenSnippetForRationale(effectiveSnippet)}`);
      }
      if (snippetLanguage && snippetLanguage !== "auto") {
        parts.push(`lang=${snippetLanguage.replace(/;/g, ",")}`);
      }
    } else if (contentMode === "system_design") {
      parts.push("template=SYSTEM_DESIGN");
      const diagram = diagramDescription.trim();
      if (diagram) {
        parts.push(`diagramHint=${diagram.replace(/;/g, ",")}`);
      }
    }

    const hint = (imageHint.trim() || DEFAULT_IMAGE_HINTS[imageHintKey]).replace(/;/g, ",");
    if (hint) parts.push(`imageHint=${hint}`);

    return parts.length > 0 ? parts.join(";") : undefined;
  };

  const onSave = async () => {
    if (!selectedSetId) {
      addToast("error", "Hãy chọn hoặc tạo bộ câu hỏi trước.");
      return;
    }
    if (!question.trim()) {
      addToast("error", "Vui lòng nhập nội dung câu hỏi.");
      return;
    }
    setSaving(true);
    try {
      const created = await addQuestionSetQuestion(selectedSetId, {
        question: question.trim(),
        questionType,
        difficulty,
        skill: skill.trim() || undefined,
        focusArea: focusArea.trim() || undefined,
        // Sample answer = đáp án thật — KHÔNG nhét snippet (parity Studio Save)
        sampleAnswer: sampleAnswer.trim() || undefined,
        evaluationCriteria: rubricLines,
        rationale: buildRationaleMeta(),
        // SCRUM-400: contentMode code → Code; theory/system_design → Text
        answerMethod: contentMode === "code" ? "Code" : "Text",
        citations: [],
      });
      if (!created) {
        addToast("error", "Lưu câu hỏi thất bại. Kiểm tra bộ vẫn ở trạng thái DRAFT.");
        return;
      }

      if (imageFile) {
        const withImage = await uploadQuestionSetQuestionImage(selectedSetId, created.id, imageFile);
        if (!withImage) {
          addToast("error", "Đã lưu câu hỏi nhưng upload ảnh thất bại. Có thể gắn lại ảnh ở History.");
        }
      }

      setSessionAdded((prev) => [
        {
          id: created.id,
          question: created.question,
          difficulty: created.difficulty,
          questionType: created.questionType,
        },
        ...prev,
      ]);
      setDrafts((prev) =>
        prev.map((d) =>
          d.questionSetId === selectedSetId
            ? { ...d, questionCount: d.questionCount + 1 }
            : d
        )
      );
      addToast("success", "Đã lưu câu hỏi (đủ field marketplace) vào bộ đã chọn.");
      resetComposer();
    } finally {
      setSaving(false);
    }
  };

  const composerDisabled = !selectedSetId;

  return (
    <div className="space-y-4">
      <div className={cn(portalCard, "px-4 py-3 sm:px-5")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={cn(portalHeading, "text-base font-semibold")}>
              Tạo câu hỏi thủ công
            </h2>
            <p className={cn(portalSubtext, "mt-0.5 text-xs")}>
              Đủ field như Studio: sample answer, rubric, skill, focus area — sẵn sàng publish marketplace
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDrafts()}
            disabled={loadingDrafts}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RefreshCw size={12} className={loadingDrafts ? "animate-spin" : ""} />
            Làm mới danh sách
          </button>
        </div>

        <ol className="mt-4 flex flex-wrap items-center gap-2">
          {STEPS.map((step, i) => {
            const done = activeStep > step.id || (step.id === 4 && sessionAdded.length > 0);
            const current = activeStep === step.id;
            return (
              <li key={step.id} className="flex items-center gap-2">
                {i > 0 ? (
                  <span className="hidden h-px w-4 bg-gray-200 sm:block dark:bg-gray-700" />
                ) : null}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                    done && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
                    current && !done && "bg-primary/10 text-primary",
                    !current && !done && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  )}
                >
                  {done ? <Check size={11} /> : <span className="tabular-nums">{step.id}</span>}
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <QuestionBuilderSetPanel
          drafts={drafts}
          loadingDrafts={loadingDrafts}
          selectedSetId={selectedSetId}
          onSelectSet={(id) => {
            setSelectedSetId(id);
            setSessionAdded([]);
          }}
          showCreateForm={showCreateForm}
          onToggleCreateForm={() => setShowCreateForm((v) => !v)}
          newTitle={newTitle}
          newDescription={newDescription}
          onNewTitleChange={setNewTitle}
          onNewDescriptionChange={setNewDescription}
          creatingSet={creatingSet}
          onCreateSet={() => void onCreateSet()}
          sessionAdded={sessionAdded}
        />

        <QuestionBuilderComposer
          disabled={composerDisabled}
          selectedSetId={selectedSetId || null}
          contentMode={contentMode}
          onContentModeChange={onContentModeChange}
          selectedTemplate={selectedTemplate}
          onTemplateChange={setSelectedTemplate}
          questionType={questionType}
          onQuestionTypeChange={setQuestionType}
          question={question}
          onQuestionChange={setQuestion}
          codeSnippet={codeSnippet}
          onCodeSnippetChange={setCodeSnippet}
          snippetLanguage={snippetLanguage}
          onSnippetLanguageChange={setSnippetLanguage}
          diagramDescription={diagramDescription}
          onDiagramDescriptionChange={setDiagramDescription}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          skill={skill}
          onSkillChange={setSkill}
          focusArea={focusArea}
          onFocusAreaChange={setFocusArea}
          sampleAnswer={sampleAnswer}
          onSampleAnswerChange={setSampleAnswer}
          rubricText={rubricText}
          onRubricTextChange={setRubricText}
          rationale={rationale}
          onRationaleChange={setRationale}
          imageHint={imageHint}
          onImageHintChange={setImageHint}
          imageHintPlaceholder={DEFAULT_IMAGE_HINTS[imageHintKey]}
          imageFileName={imageFile?.name ?? null}
          onPickImage={onPickImage}
          saving={saving}
          onSave={() => void onSave()}
        />

        <QuestionBuilderPreview
          difficulty={difficulty}
          questionType={questionType}
          prompt={question}
          contentMode={contentMode}
          templateId={contentMode === "theory" ? null : selectedTemplate}
          snippet={contentMode === "code" ? effectiveSnippet : undefined}
          snippetLanguage={
            contentMode === "code" && snippetLanguage !== "auto" ? snippetLanguage : undefined
          }
          diagramDescription={contentMode === "system_design" ? diagramDescription : undefined}
          attachedImageUrl={localPreviewUrl}
          skill={skill}
          focusArea={focusArea}
          sampleAnswer={sampleAnswer}
          rubricLines={rubricLines}
          selectedSetTitle={selectedSet?.title ?? null}
        />
      </div>
    </div>
  );
}
