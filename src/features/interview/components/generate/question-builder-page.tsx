"use client";

/**
 * Question Builder — một danh sách câu bên trái, ô soạn đúng câu đang chọn ở giữa.
 * Thêm nhiều câu nằm trên danh sách và dùng chung loại/độ khó với form.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StudioCodeTemplateId } from "@/features/studio/constants/question-templates";
import type { DifficultyLevel, QuestionType } from "@/features/interview/types/generation-session";
import {
  addQuestionSetQuestion,
  createManualDraftQuestionSet,
  updateQuestionSetQuestion,
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
import {
  BULK_MAX,
  QuestionBuilderBulkBar,
  splitBulkLines,
} from "@/features/interview/components/generate/question-builder-bulk-bar";
import { QuestionBuilderPreview } from "@/features/interview/components/generate/question-builder-preview";
import {
  emptyRubric,
  prepareRubricForSave,
  rubricToApiPayload,
  type RubricV1,
} from "@/shared/rubric";

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

function defaultQuestionType(mode: ContentMode): QuestionType {
  if (mode === "system_design") return "System-design";
  if (mode === "code") return "Problem-solving";
  return "Technical";
}

function defaultTemplate(mode: ContentMode): StudioCodeTemplateId {
  if (mode === "system_design") return "SYSTEM_DESIGN";
  return "BUG_DETECTION";
}

/** Bản nháp local của một câu trong phiên — không gửi lên server cho đến khi bấm lưu. */
type QuestionDraft = {
  contentMode: ContentMode;
  selectedTemplate: StudioCodeTemplateId;
  codeSnippet: string;
  snippetLanguage: string;
  diagramDescription: string;
  skill: string;
  focusArea: string;
  sampleAnswer: string;
  rubricDoc: RubricV1;
  rationale: string;
  imageHint: string;
  imageFile: File | null;
  imagePreviewUrl: string | null;
  imageDirty: boolean;
};

function nextOrder(items: SessionAddedQuestion[]) {
  return items.reduce((max, item) => Math.max(max, item.order), 0) + 1;
}

export function QuestionBuilderPage() {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const qb = t.questionBuilder;

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
  // Mặc định mở form tạo bộ mới — không auto chọn draft có sẵn
  const [showCreateForm, setShowCreateForm] = useState(true);

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
  const [rubricDoc, setRubricDoc] = useState<RubricV1>(() => emptyRubric());
  const [rationale, setRationale] = useState("");
  const [imageHint, setImageHint] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sessionAdded, setSessionAdded] = useState<SessionAddedQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  /** true khi user vừa chọn ảnh và chưa upload cho câu đang mở. */
  const [imageDirty, setImageDirty] = useState(false);

  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPaste, setBulkPaste] = useState("");
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const bulkCreatingLockRef = useRef(false);
  /** Chi tiết local theo id câu, để bấm sang câu khác không mất rubric/ảnh. */
  const draftsRef = useRef(new Map<string, QuestionDraft>());

  const selectedSet = useMemo(
    () => drafts.find((d) => d.questionSetId === selectedSetId) ?? null,
    [drafts, selectedSetId]
  );

  // code template → Code; theory / SYSTEM_DESIGN → Text (giống Studio). Computed
  // once and reused by both the save payload and the preview badge, instead of
  // repeating the same condition in two places that could drift apart.
  const answerMethod: "Text" | "Code" = useMemo(
    () => (contentMode === "code" && selectedTemplate !== "SYSTEM_DESIGN" ? "Code" : "Text"),
    [contentMode, selectedTemplate]
  );

  const effectiveSnippet = useMemo(() => {
    if (contentMode !== "code") return "";
    if (codeSnippet.trim()) return codeSnippet;
    if (selectedTemplate === "SYSTEM_DESIGN") return "";
    return DEFAULT_SNIPPETS[selectedTemplate as Exclude<StudioCodeTemplateId, "SYSTEM_DESIGN">] ?? "";
  }, [contentMode, codeSnippet, selectedTemplate]);

  const rubricLines = useMemo(
    () => rubricDoc.criteria.map((c) => `[${c.weight}%] ${c.label}`),
    [rubricDoc]
  );

  const imageHintKey: StudioCodeTemplateId | "THEORY" =
    contentMode === "theory"
      ? "THEORY"
      : contentMode === "system_design"
        ? "SYSTEM_DESIGN"
        : selectedTemplate;

  const editingOrder = sessionAdded.find((item) => item.id === editingId)?.order ?? null;

  const loadDrafts = useCallback(async (preferId?: string) => {
    setLoadingDrafts(true);
    try {
      const items = await listHistoryQuestionSets();
      const onlyDraft = items.filter((x) => x.status === "DRAFT");
      setDrafts(onlyDraft);
      // Không auto chọn bộ đầu tiên — chỉ chọn khi vừa tạo (preferId) hoặc giữ lựa chọn hiện tại
      setSelectedSetId((prev) => {
        if (preferId && onlyDraft.some((d) => d.questionSetId === preferId)) return preferId;
        if (prev && onlyDraft.some((d) => d.questionSetId === prev)) return prev;
        return "";
      });
      if (preferId && onlyDraft.some((d) => d.questionSetId === preferId)) {
        setShowCreateForm(false);
      } else if (onlyDraft.length === 0) {
        setShowCreateForm(true);
      }
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  // Danh sách và ô soạn cùng một câu: gõ là dòng đang chọn đổi theo.
  useEffect(() => {
    if (!editingId) return;
    setSessionAdded((prev) =>
      prev.map((item) =>
        item.id === editingId &&
        (item.question !== question || item.difficulty !== difficulty || item.questionType !== questionType)
          ? { ...item, question, difficulty, questionType }
          : item
      )
    );
  }, [editingId, question, difficulty, questionType]);

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

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(URL.createObjectURL(file));
    setImageFile(file);
    setImageDirty(true);
  };

  const onRemoveImage = () => {
    if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    setLocalPreviewUrl(null);
    setImageFile(null);
    setImageDirty(true);
  };

  const captureDraft = (): QuestionDraft => ({
    contentMode,
    selectedTemplate,
    codeSnippet,
    snippetLanguage,
    diagramDescription,
    skill,
    focusArea,
    sampleAnswer,
    rubricDoc,
    rationale,
    imageHint,
    imageFile,
    imagePreviewUrl: localPreviewUrl,
    imageDirty,
  });

  const rememberCurrent = () => {
    if (!editingId) return;
    draftsRef.current.set(editingId, captureDraft());
    setSessionAdded((prev) =>
      prev.map((item) =>
        item.id === editingId ? { ...item, question, difficulty, questionType } : item
      )
    );
  };

  const applyQuestion = (item: SessionAddedQuestion, draft: QuestionDraft | undefined) => {
    setQuestion(item.question);
    setDifficulty((item.difficulty as DifficultyLevel) || "Medium");
    setQuestionType((item.questionType as QuestionType) || "Technical");
    setContentMode(draft?.contentMode ?? "theory");
    setSelectedTemplate(draft?.selectedTemplate ?? "BUG_DETECTION");
    setCodeSnippet(draft?.codeSnippet ?? "");
    setSnippetLanguage(draft?.snippetLanguage ?? "auto");
    setDiagramDescription(draft?.diagramDescription ?? "");
    setSkill(draft?.skill ?? "");
    setFocusArea(draft?.focusArea ?? "");
    setSampleAnswer(draft?.sampleAnswer ?? "");
    setRubricDoc(draft?.rubricDoc ?? emptyRubric());
    setRationale(draft?.rationale ?? "");
    setImageHint(draft?.imageHint ?? "");
    setImageFile(draft?.imageFile ?? null);
    setLocalPreviewUrl(draft?.imagePreviewUrl ?? null);
    setImageDirty(draft?.imageDirty ?? false);
  };

  const clearSession = () => {
    const urls = new Set<string>();
    for (const draft of draftsRef.current.values()) {
      if (draft.imagePreviewUrl) urls.add(draft.imagePreviewUrl);
    }
    if (localPreviewUrl) urls.add(localPreviewUrl);
    for (const url of urls) URL.revokeObjectURL(url);
    draftsRef.current.clear();
    setSessionAdded([]);
    setEditingId(null);
    setQuestion("");
    setCodeSnippet("");
    setSnippetLanguage("auto");
    setDiagramDescription("");
    setSampleAnswer("");
    setRubricDoc(emptyRubric());
    setRationale("");
    setImageHint("");
    setSkill("");
    setFocusArea("");
    setImageFile(null);
    setLocalPreviewUrl(null);
    setImageDirty(false);
  };

  const selectQuestion = (id: string) => {
    if (saving || bulkCreating) return;
    if (id === editingId) return;
    rememberCurrent();
    const target = sessionAdded.find((item) => item.id === id);
    if (!target) return;
    applyQuestion(target, draftsRef.current.get(id));
    setEditingId(id);
  };

  const startNewQuestion = () => {
    if (saving || bulkCreating) return;
    rememberCurrent();
    setEditingId(null);
    setQuestion("");
    setCodeSnippet("");
    setSnippetLanguage("auto");
    setDiagramDescription("");
    setSampleAnswer("");
    setRubricDoc(emptyRubric());
    setRationale("");
    setImageHint("");
    setSkill("");
    setFocusArea("");
    setImageFile(null);
    setLocalPreviewUrl(null);
    setImageDirty(false);
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
      clearSession();
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

  /** Không tự gắn rubric mẫu — để trống thì câu vẫn sẵn sàng, HR bổ sung sau. */
  const resolvedRubric = (): RubricV1 => rubricToApiPayload(rubricDoc);

  const bumpCount = () => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.questionSetId === selectedSetId ? { ...d, questionCount: d.questionCount + 1 } : d
      )
    );
  };

  /** Upload ảnh nếu user vừa chọn file. Trả về true khi không cần upload hoặc upload xong. */
  const uploadIfDirty = async (questionId: string) => {
    if (!imageFile || !imageDirty || !selectedSetId) return true;
    const withImage = await uploadQuestionSetQuestionImage(selectedSetId, questionId, imageFile);
    if (!withImage) {
      addToast("error", qb.toastImageUploadFailed);
      return false;
    }
    return true;
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
      const parsed = resolvedRubric();
      const rationaleMeta = buildRationaleMeta();
      if (editingId) {
        let ok = false;
        try {
          ok = await updateQuestionSetQuestion(selectedSetId, editingId, {
            question: question.trim(),
            questionType,
            difficulty,
            skill: skill.trim() || null,
            focusArea: focusArea.trim() || null,
            sampleAnswer: sampleAnswer.trim() || null,
            rationale: rationaleMeta ?? null,
            scoringRubric: prepareRubricForSave(parsed).displayText || null,
            answerMethod,
          });
        } catch (err) {
          addToast("error", err instanceof Error && err.message !== "RUBRIC_WEIGHT_INVALID" ? err.message : qb.toastSaveFailed);
          return;
        }
        if (!ok) {
          addToast("error", qb.toastSaveFailed);
          return;
        }
        const imageOk = await uploadIfDirty(editingId);
        if (imageOk) setImageDirty(false);
        setRubricDoc(parsed);
        draftsRef.current.set(editingId, {
          ...captureDraft(),
          rubricDoc: parsed,
          imageDirty: !imageOk,
        });
        addToast("success", qb.toastUpdateSuccess);
        return;
      }

      const created = await addQuestionSetQuestion(selectedSetId, {
        question: question.trim(),
        questionType,
        difficulty,
        skill: skill.trim() || undefined,
        focusArea: focusArea.trim() || undefined,
        sampleAnswer: sampleAnswer.trim() || undefined,
        evaluationCriteria: parsed.criteria as unknown[],
        rationale: rationaleMeta,
        answerMethod,
        citations: [],
      });
      if (!created) {
        addToast("error", qb.toastSaveFailed);
        return;
      }
      const imageOk = await uploadIfDirty(created.id);
      if (imageOk) setImageDirty(false);
      setRubricDoc(parsed);
      const item: SessionAddedQuestion = {
        id: created.id,
        order: nextOrder(sessionAdded),
        question: created.question,
        difficulty: created.difficulty,
        questionType: created.questionType,
      };
      setSessionAdded((prev) => [...prev, item]);
      draftsRef.current.set(created.id, {
        ...captureDraft(),
        rubricDoc: parsed,
        imageDirty: !imageOk,
      });
      setEditingId(created.id);
      bumpCount();
      addToast("success", qb.toastSaveSuccess);
    } finally {
      setSaving(false);
    }
  };

  const composerDisabled = !selectedSetId;

  /** Thêm nhiều câu text, dùng loại và độ khó đang chọn ở form. */
  const onBulkCreate = async () => {
    if (bulkCreatingLockRef.current || bulkCreating) return;
    if (!selectedSetId) {
      addToast("error", qb.bulkBar.toastNeedSet);
      return;
    }
    const pasted = splitBulkLines(bulkPaste);
    const total = pasted.length > 0 ? Math.min(pasted.length, BULK_MAX) : Math.min(BULK_MAX, Math.max(1, bulkCount));

    bulkCreatingLockRef.current = true;
    setBulkCreating(true);
    let working = sessionAdded;
    let ok = 0;
    try {
      // Câu mới đang gõ chưa có trong danh sách — lưu trước để không mất chữ.
      if (!editingId && question.trim()) {
        const parsed = resolvedRubric();
        const created = await addQuestionSetQuestion(selectedSetId, {
          question: question.trim(),
          questionType,
          difficulty,
          skill: skill.trim() || undefined,
          focusArea: focusArea.trim() || undefined,
          sampleAnswer: sampleAnswer.trim() || undefined,
          evaluationCriteria: parsed.criteria as unknown[],
          rationale: buildRationaleMeta(),
          answerMethod,
          citations: [],
        });
        if (!created) {
          addToast("error", qb.toastSaveFailed);
          return;
        }
        const imageOk = await uploadIfDirty(created.id);
        const pending: SessionAddedQuestion = {
          id: created.id,
          order: nextOrder(working),
          question: created.question,
          difficulty: created.difficulty,
          questionType: created.questionType,
        };
        draftsRef.current.set(created.id, {
          ...captureDraft(),
          rubricDoc: parsed,
          imageDirty: !imageOk,
        });
        working = [...working, pending];
        setSessionAdded(working);
        bumpCount();
      } else if (editingId) {
        rememberCurrent();
      }

      const start = nextOrder(working);
      const texts =
        pasted.length > 0
          ? pasted.slice(0, BULK_MAX)
          : Array.from({ length: total }, (_, i) => `${qb.bulkBar.placeholderPrefix} ${start + i}`);
      const added: SessionAddedQuestion[] = [];
      for (let i = 0; i < texts.length; i++) {
        const created = await addQuestionSetQuestion(selectedSetId, {
          question: texts[i],
          questionType,
          difficulty,
          answerMethod: "Text",
          evaluationCriteria: [],
          citations: [],
        });
        if (!created) {
          if (ok === 0) {
            addToast("error", qb.bulkBar.toastFailed);
          } else {
            addToast(
              "error",
              qb.bulkBar.toastPartial.replace("{{ok}}", String(ok)).replace("{{total}}", String(total))
            );
          }
          if (added[0]) {
            applyQuestion(added[0], undefined);
            setEditingId(added[0].id);
          }
          return;
        }
        ok += 1;
        const item: SessionAddedQuestion = {
          id: created.id,
          order: start + i,
          question: created.question,
          difficulty: created.difficulty,
          questionType: created.questionType,
        };
        added.push(item);
        working = [...working, item];
        setSessionAdded(working);
        bumpCount();
      }
      addToast(
        "success",
        qb.bulkBar.toastSuccess.replace("{{ok}}", String(ok)).replace("{{total}}", String(total))
      );
      setBulkPaste("");
      setBulkOpen(false);
      if (added[0]) {
        applyQuestion(added[0], undefined);
        setEditingId(added[0].id);
      }
    } finally {
      bulkCreatingLockRef.current = false;
      setBulkCreating(false);
    }
  };

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
      </header>

      {/* ── 3-column grid ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <div style={{ animation: "slideUpFade 0.42s cubic-bezier(0.25,0.46,0.45,0.94) both 0.1s" }}>
          <QuestionBuilderSetPanel
            drafts={drafts}
            loadingDrafts={loadingDrafts}
            selectedSetId={selectedSetId}
            onSelectSet={(id) => {
              if (id === selectedSetId) return;
              setSelectedSetId(id);
              setShowCreateForm(false);
              clearSession();
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
            editingId={editingId}
            onSelectQuestion={selectQuestion}
            questionsLocked={saving || bulkCreating}
            bulkSlot={
              <QuestionBuilderBulkBar
                disabled={composerDisabled}
                creating={bulkCreating}
                count={bulkCount}
                pasteText={bulkPaste}
                onCountChange={setBulkCount}
                onPasteTextChange={setBulkPaste}
                onCreate={() => void onBulkCreate()}
                open={bulkOpen}
                onOpenChange={setBulkOpen}
              />
            }
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
            rubricDoc={rubricDoc}
            onRubricDocChange={setRubricDoc}
            rationale={rationale}
            onRationaleChange={setRationale}
            imageHint={imageHint}
            onImageHintChange={setImageHint}
            imageHintPlaceholder={DEFAULT_IMAGE_HINTS[imageHintKey]}
            imageFileName={imageFile?.name ?? null}
            onPickImage={onPickImage}
            imagePreviewUrl={localPreviewUrl}
            onRemoveImage={onRemoveImage}
            saving={saving}
            onSave={() => void onSave()}
            selectionKey={editingId ?? "new"}
            editingOrder={editingOrder}
            onStartNew={startNewQuestion}
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
            rubricDoc={rubricDoc}
            answerMethod={answerMethod}
            selectedSetTitle={selectedSet?.title ?? null}
          />
        </div>
      </div>
    </div>
  );
}
