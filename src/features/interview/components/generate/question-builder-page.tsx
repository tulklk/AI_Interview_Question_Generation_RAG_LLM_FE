"use client";

/**
 * SCRUM-397 v3: Question Builder — workspace soạn câu hỏi thủ công
 * đủ field như Studio Save (sampleAnswer, rubric, skill, focusArea, questionType).
 * Chọn/tạo bộ → Loại nội dung → Soạn → Preview → Lưu
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Check, RefreshCw } from "lucide-react";
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
import { useLanguage } from "@/shared/providers/language-context";
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
  const { t } = useLanguage();
  const qb = t.questionBuilder;

  /** Translated steps — derived inside component so they react to language changes */
  const STEPS = [
    { id: 1, label: qb.steps.selectSet },
    { id: 2, label: qb.steps.selectType },
    { id: 3, label: qb.steps.compose },
    { id: 4, label: qb.steps.save },
  ] as const;

  /** Translated image hints keyed by template id / "THEORY" */
  const DEFAULT_IMAGE_HINTS: Record<StudioCodeTemplateId | "THEORY", string> = {
    THEORY: qb.imageHints.THEORY,
    CODE_COMPLETION: qb.imageHints.CODE_COMPLETION,
    BUG_DETECTION: qb.imageHints.BUG_DETECTION,
    REFACTORING: qb.imageHints.REFACTORING,
    TEST_CASE_DESIGN: qb.imageHints.TEST_CASE_DESIGN,
    PERFORMANCE_ANALYSIS: qb.imageHints.PERFORMANCE_ANALYSIS,
    SYSTEM_DESIGN: qb.imageHints.SYSTEM_DESIGN,
  };

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

  type ChipVariant = "done" | "action" | "idle";
  const { chipText, chipVariant } = useMemo((): { chipText: string; chipVariant: ChipVariant } => {
    if (question.trim())          return { chipText: qb.chipReadyToSave,   chipVariant: "action" };
    if (sessionAdded.length > 0)  return { chipText: qb.chipQuestionsAdded.replace("{{n}}", String(sessionAdded.length)), chipVariant: "done" };
    if (selectedSetId)            return { chipText: qb.chipSetSelected,   chipVariant: "action" };
    return                               { chipText: qb.chipSelectSet,     chipVariant: "idle" };
  // qb reference is stable across language changes since it re-derives from t
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSetId, question, sessionAdded.length, qb.chipReadyToSave, qb.chipQuestionsAdded, qb.chipSetSelected, qb.chipSelectSet]);

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
      addToast("error", qb.toastTitleRequired);
      return;
    }
    setCreatingSet(true);
    try {
      const created = await createManualDraftQuestionSet({
        title,
        description: newDescription.trim() || undefined,
      });
      addToast("success", qb.toastCreateSuccess);
      setNewTitle("");
      setNewDescription("");
      setShowCreateForm(false);
      setSessionAdded([]);
      await loadDrafts(created.questionSetId);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : qb.toastCreateError);
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
      addToast("error", qb.toastSelectSetFirst);
      return;
    }
    if (!question.trim()) {
      addToast("error", qb.toastQuestionRequired);
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
        addToast("error", qb.toastSaveFailed);
        return;
      }

      if (imageFile) {
        const withImage = await uploadQuestionSetQuestionImage(selectedSetId, created.id, imageFile);
        if (!withImage) {
          addToast("error", qb.toastImageUploadFailed);
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
      addToast("success", qb.toastSaveSuccess);
      resetComposer();
    } finally {
      setSaving(false);
    }
  };

  const composerDisabled = !selectedSetId;

  return (
    <div className="space-y-4">
      {/* ── Header — Studio-style ── */}
      <header style={{ animation: "slideUpFade 0.4s cubic-bezier(0.25,0.46,0.45,0.94) both" }}>
        {/* Title row */}
        <div className="flex flex-col gap-3 px-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              {qb.pageTitle}
            </h1>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {qb.pageSubtext}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/hr/generate-question"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors",
                "hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900",
                "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              )}
            >
              <ArrowLeft size={16} className="text-primary" />
              <span className="hidden sm:inline">{qb.backToGenerateBtn}</span>
            </Link>

            <button
              type="button"
              onClick={() => void loadDrafts()}
              disabled={loadingDrafts}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors",
                "hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900",
                "dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-100",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <RefreshCw size={16} className={cn("transition-transform", loadingDrafts && "animate-spin")} />
              <span className="hidden sm:inline">{qb.refreshBtn}</span>
            </button>
          </div>
        </div>

        {/* Progress stepper — mirrors StudioProgressBar */}
        <section className="px-1 py-1.5">
          <div className="flex items-center gap-2 sm:gap-4">
            <ol className="flex flex-1 items-center min-w-0 select-none">
              {STEPS.map((step, idx) => {
                const done     = activeStep > step.id || (step.id === 4 && sessionAdded.length > 0);
                const isActive = activeStep === step.id && !done;
                const connectorDelay = `-${((STEPS.length - 1 - idx) * 0.9).toFixed(1)}s`;

                return (
                  <li key={step.id} className={cn("flex min-w-0 items-center", idx < STEPS.length - 1 && "flex-1")}>
                    {/* Circle + label */}
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      <div
                        className={cn(
                          "relative flex h-7 w-7 items-center justify-center rounded-full shrink-0 transition-all duration-300",
                          done
                            ? "hr-stepper-done text-white shadow-sm"
                            : isActive
                              ? "hr-stepper-active text-white"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                        )}
                        aria-current={isActive ? "step" : undefined}
                      >
                        {done ? (
                          <Check
                            className="h-3.5 w-3.5"
                            strokeWidth={3}
                            style={{ animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}
                          />
                        ) : (
                          <span className="text-[10px] font-bold">{idx + 1}</span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "hidden sm:block text-center whitespace-nowrap leading-tight transition-colors duration-200",
                          isActive
                            ? "text-[10px] font-semibold text-[#7C3AED] dark:text-[#a78bff]"
                            : done
                              ? "text-[10px] font-medium text-emerald-600 dark:text-emerald-400"
                              : "text-[10px] font-medium text-gray-400 dark:text-gray-500"
                        )}
                      >
                        {step.label}
                      </span>
                    </div>

                    {/* Connector */}
                    {idx < STEPS.length - 1 && (
                      <div
                        className={cn(
                          "mx-2 flex-1 h-px transition-all duration-500",
                          done
                            ? "hr-stepper-connector-done"
                            : "bg-gray-200 dark:bg-gray-700"
                        )}
                        style={done ? ({ "--connector-delay": connectorDelay } as CSSProperties) : undefined}
                        aria-hidden
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            {/* Status chip */}
            <div
              key={chipVariant + chipText}
              style={{ animation: "scaleInFade 0.3s cubic-bezier(0.34,1.56,0.64,1) both" }}
              className={cn(
                "hidden sm:flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold whitespace-nowrap border",
                chipVariant === "done"   && "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/40",
                chipVariant === "action" && "bg-primary/8 text-primary border-primary/15 dark:bg-primary/15 dark:text-primary dark:border-primary/30",
                chipVariant === "idle"   && "bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-900/60 dark:text-gray-400 dark:border-gray-800"
              )}
              aria-live="polite"
            >
              {chipVariant === "done"
                ? <Check className="h-2.5 w-2.5 shrink-0" strokeWidth={3} />
                : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />}
              <span>{chipText}</span>
            </div>
          </div>
        </section>
      </header>

      {/* ── 3-column grid ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <div style={{ animation: "slideUpFade 0.42s cubic-bezier(0.25,0.46,0.45,0.94) both 0.1s" }}>
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
        </div>

        <div style={{ animation: "slideUpFade 0.42s cubic-bezier(0.25,0.46,0.45,0.94) both 0.18s" }}>
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
        </div>

        <div style={{ animation: "slideUpFade 0.42s cubic-bezier(0.25,0.46,0.45,0.94) both 0.26s" }}>
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
    </div>
  );
}
