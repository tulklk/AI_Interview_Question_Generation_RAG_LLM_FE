"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/shared/providers/toast-context";
import { useLanguage } from "@/shared/providers/language-context";
import { extractErrorMessage } from "@/core/interceptors/error.interceptor";
import { isJdInputRejectError } from "@/features/studio/utils/jd-input-error";
import { pollGenerationRun } from "@/features/studio/utils/poll-generation-run";
import * as studioApi from "@/features/studio/services/studio.service";
import type {
  AnalyzeJobDescriptionResponse,
  ChatMessage,
  GenerationRun,
  PlanDetail,
  PlanSummary,
  StudioDocument,
  StudioProject,
  StudioProjectDetail,
  StudioQuestion,
  StudioSettings,
} from "@/features/studio/types/studio.types";
import type { ApplyPlanSettingsPayload } from "@/features/studio/types/studio.types";
import {
  DEFAULT_ENABLED_CODE_TEMPLATES,
  type StudioContentMode,
  type StudioCodeTemplateId,
} from "@/features/studio/constants/question-templates";
import { refineJdSummary } from "@/features/studio/utils/refine-jd-summary";
import { buildApplyRecommendationPatch } from "@/features/studio/utils/ai-config-helpers";
import { normalizeStudioSettings } from "@/features/studio/utils/normalize-studio-settings";

const STUDIO_TASK_KEY = "studio_active_task";
const STUDIO_ACTIVE_PROJECT_KEY = "studio_active_project_id";

/** SCRUM-402: ghi project đang làm để bootstrap không restore phiên cũ */
function persistActiveProjectId(id: string) {
  try {
    localStorage.setItem(STUDIO_ACTIVE_PROJECT_KEY, id);
  } catch {
    /* ignore */
  }
}

type StudioTaskKind = "streaming" | "generating";

/** SCRUM-402: payload JSON { task, projectId }; legacy string vẫn đọc được ở badge */
function broadcastStudioTask(task: StudioTaskKind | null, projectId?: string | null) {
  try {
    if (task) {
      localStorage.setItem(
        STUDIO_TASK_KEY,
        JSON.stringify({ task, projectId: projectId ?? null })
      );
    } else {
      localStorage.removeItem(STUDIO_TASK_KEY);
    }
    window.dispatchEvent(
      new CustomEvent("studio:task-changed", {
        detail: { task, projectId: projectId ?? null },
      })
    );
  } catch {
    /* ignore */
  }
}

export function useStudio() {
  const { addToast } = useToast();
  const { t, lang } = useLanguage();
  const tx = t.studioPage.toasts;
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [jdContent, setJdContentState] = useState("");
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  /** SCRUM-432: cảnh báo vàng dưới paste/upload khi JD bị reject — không toast popup */
  const [jdInputWarning, setJdInputWarning] = useState<string | null>(null);
  const [jdSummary, setJdSummary] = useState<AnalyzeJobDescriptionResponse | null>(null);

  const setJdContent = useCallback((value: string) => {
    setJdContentState(value);
    setJdInputWarning(null);
  }, []);
  const [documents, setDocuments] = useState<StudioDocument[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanDetail | null>(null);
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [questions, setQuestions] = useState<StudioQuestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isApplyingSettings, setIsApplyingSettings] = useState(false);
  const [isRecommendingConfig, setIsRecommendingConfig] = useState(false);
  const [isApplyingRecommendation, setIsApplyingRecommendation] = useState(false);
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const [generationRun, setGenerationRun] = useState<GenerationRun | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  /** Set to true when BE rejects generateQuestions with COOLDOWN_ACTIVE / QUOTA_EXCEEDED.
   *  Reset to false at the start of each new generate attempt. */
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  /** P2b: Set to true when BE rejects generateQuestions with QUESTIONS_ALREADY_EXIST,
   *  meaning the user must explicitly confirm before questions are replaced. */
  const [questionsAlreadyExist, setQuestionsAlreadyExist] = useState(false);

  /** P2a: Cancelled flag set to true when the hook's host component unmounts.
   *  Prevents the generateQuestions poll loop from calling setState after unmount
   *  and from making unnecessary API calls for up to 5 minutes after navigation. */
  const generateCancelledRef = useRef(false);
  useEffect(() => {
    generateCancelledRef.current = false;
    return () => { generateCancelledRef.current = true; };
  }, []);

  /** P2c: Monotonic version counter for updateSettingField.
   *  A slow first request's rollback is discarded when a second request has
   *  already completed — the counter tells us which response is "latest". */
  const settingsVersionRef = useRef(0);

  /** P2c fix: mirrors `settings`, but updateSettingField also writes to it
   *  synchronously (not just via the sync effect below, which only runs after
   *  a commit). This lets a second updateSettingField call fired before React
   *  re-renders build on the first call's optimistic change instead of
   *  reading a stale `settings` closure and reverting it. */
  const settingsRef = useRef<StudioSettings | null>(null);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Bộ câu hỏi chỉ còn "đã lưu" chừng nào danh sách chưa đổi lại (sinh mới, sửa, xoá, đổi project).
  useEffect(() => {
    setIsDraftSaved(false);
  }, [questions, project?.id]);

  // SCRUM-402: badge theo streaming / generate loop / run Pending|Generating sau remount
  useEffect(() => {
    const runBusy =
      generationRun?.status === "Generating" || generationRun?.status === "Pending";
    if (isStreaming) broadcastStudioTask("streaming", project?.id);
    else if (isGeneratingQuestions || runBusy) broadcastStudioTask("generating", project?.id);
    else broadcastStudioTask(null);
  }, [isStreaming, isGeneratingQuestions, generationRun?.status, project?.id]);

  const normalizeSettings = useCallback(
    (s: StudioSettings | null) => normalizeStudioSettings(s),
    []
  );

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      let ownedProjects = await studioApi.listProjects();
      // Normalize list items (id/name casing)
      ownedProjects = (ownedProjects ?? []).map((p) => ({
        ...p,
        id: (p as { id?: string; Id?: string }).id ?? (p as { Id?: string }).Id ?? "",
        name: (p as { name?: string; Name?: string }).name ?? (p as { Name?: string }).Name ?? "",
        status: ((p as { status?: string; Status?: string }).status
          ?? (p as { Status?: string }).Status
          ?? "Draft") as StudioProject["status"],
      }));

      if (ownedProjects.length === 0) {
        await studioApi.createProject("Interview Plan Studio", "Project mặc định cho Tạo câu hỏi v2");
        ownedProjects = await studioApi.listProjects();
      }

      let preferredId: string | null = null;
      try {
        preferredId = localStorage.getItem(STUDIO_ACTIVE_PROJECT_KEY);
      } catch {
        preferredId = null;
      }

      const target =
        (preferredId ? ownedProjects.find((p) => p.id === preferredId) : null)
        ?? ownedProjects[0]
        ?? null;

      // Load full detail (questionSetId / isPublished)
      const detail = target
        ? await studioApi.getProject(target.id).catch(() => target as StudioProjectDetail)
        : null;
      setProject(detail);
      if (!detail) return;

      // SCRUM-402: đồng bộ localStorage với project vừa chọn (kể cả fallback newest)
      persistActiveProjectId(detail.id);

      const [summary, docs, plan, studioSettings, chatMessages, planList, runs] = await Promise.all([
        studioApi.getJobDescription(detail.id).catch(() => null),
        studioApi.listDocuments(detail.id).catch(() => []),
        studioApi.getCurrentPlan(detail.id).catch(() => null),
        studioApi.getSettings(detail.id).catch(() => null),
        studioApi.getChatMessages(detail.id).catch(() => []),
        studioApi.listPlans(detail.id).catch(() => []),
        studioApi.listGenerationRuns(detail.id).catch(() => [] as GenerationRun[]),
      ]);

      if (summary) {
        setJdContent(summary.content ?? "");
        setJdFileName(
          summary.sourceType === "UploadedFile" ? (summary.originalFileName ?? null) : null
        );
        const baseSummary = summary.summary ?? {
          detectedRole: null,
          detectedSeniority: null,
          detectedLanguage: null,
          skills: [],
          position: null,
        };
        // SCRUM-416: ưu tiên position top-level từ GET, rồi summary.position
        const withPosition: AnalyzeJobDescriptionResponse = {
          ...baseSummary,
          position: summary.position?.trim() || baseSummary.position || baseSummary.detectedRole || null,
        };
        const locale = lang === "en" ? "en" : "vi";
        setJdSummary(refineJdSummary(summary.content ?? "", withPosition, locale));
      } else {
        setJdFileName(null);
        setJdSummary(null);
      }
      setDocuments(docs);
      setCurrentPlan(plan);
      setSettings(normalizeSettings(studioSettings));
      setMessages(chatMessages);
      setPlans(planList);
      const latestRun = runs[0] ?? null;
      setGenerationRun(latestRun);
      if (plan) {
        const qs = await studioApi.listQuestions(detail.id, { page: 1, pageSize: 100, planId: plan.id }).catch(() => null);
        if (qs) setQuestions(qs.items);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tx.loadFailed;
      addToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [addToast, lang, normalizeSettings, tx.loadFailed]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Poll status RAG (Queued/Processing) giống Knowledge Base HR
  useEffect(() => {
    if (!project) return;
    const hasPending = documents.some((d) => d.status === "Pending" || d.status === "Processing");
    if (!hasPending) return;

    const timer = window.setInterval(() => {
      void studioApi.listDocuments(project.id).then(setDocuments).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [project, documents]);

  // Auto-poll a pending generation run that was restored by bootstrap (e.g. after page reload /
  // browser tab switch). Without this, progress would be frozen until the user clicks "Làm mới".
  useEffect(() => {
    if (!project || isGeneratingQuestions) return; // already tracked by the generateQuestions while-loop
    if (!generationRun?.id) return;
    if (generationRun.status !== "Generating" && generationRun.status !== "Pending") return;

    const projectId = project.id;
    const runId = generationRun.id;
    const planId = currentPlan?.id ?? null;

    const timer = window.setInterval(async () => {
      const latest = await studioApi.getGenerationRun(projectId, runId).catch(() => null);
      if (!latest) return;
      setGenerationRun(latest);
      if (latest.status === "Completed" && planId) {
        const result = await studioApi
          .listQuestions(projectId, { page: 1, pageSize: 100, planId })
          .catch(() => null);
        if (result) setQuestions(result.items);
      }
    }, 3000);

    return () => window.clearInterval(timer);
  // Depend on id+status so the timer restarts whenever the run progresses; isGeneratingQuestions
  // ensures we don't double-poll while the generateQuestions while-loop is also running.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, isGeneratingQuestions, generationRun?.id, generationRun?.status, currentPlan?.id]);

  const refreshPlanAndSettings = useCallback(async () => {
    if (!project) return;
    const [plan, studioSettings, planList] = await Promise.all([
      studioApi.getCurrentPlan(project.id).catch(() => null),
      studioApi.getSettings(project.id).catch(() => null),
      studioApi.listPlans(project.id).catch(() => []),
    ]);
    setCurrentPlan(plan);
    // SCRUM-388: BE settings là source of truth (kể cả output prefs sau chat refine)
    if (studioSettings) setSettings(normalizeSettings(studioSettings));
    setPlans(planList);
  }, [normalizeSettings, project]);

  /** SCRUM-376: hydrate transcript từ DB sau generate/refine/apply/approve */
  const refreshMessages = useCallback(async () => {
    if (!project) return;
    const chatMessages = await studioApi.getChatMessages(project.id).catch(() => null);
    if (chatMessages) setMessages(chatMessages);
  }, [project]);

  const refreshStudioState = useCallback(async () => {
    await refreshPlanAndSettings();
    await refreshMessages();
  }, [refreshMessages, refreshPlanAndSettings]);

  const saveJobDescription = useCallback(async () => {
    if (!project || !jdContent.trim()) return;
    try {
      // SCRUM-432: PUT đã classify + extract — không gọi analyze lần 2
      const summary = await studioApi.upsertJobDescription(project.id, jdContent, "PastedText");
      setJdFileName(null);
      setJdInputWarning(null);
      const locale = lang === "en" ? "en" : "vi";
      setJdSummary(refineJdSummary(jdContent, summary, locale));
      addToast("success", tx.jdSaved);
      await refreshPlanAndSettings();
    } catch (error) {
      const message = extractErrorMessage(error, lang) || tx.jdSaveFailed;
      // Không phải JD / không phải IT → chữ vàng dưới ô nhập, không popup
      if (isJdInputRejectError(error)) {
        setJdInputWarning(message);
        return;
      }
      setJdInputWarning(null);
      addToast("error", message);
    }
  }, [addToast, jdContent, lang, project, refreshPlanAndSettings, tx.jdSaved, tx.jdSaveFailed]);

  const uploadJobDescription = useCallback(async (file: File): Promise<boolean> => {
    if (!project) return false;
    try {
      const result = await studioApi.uploadJobDescriptionFile(project.id, file);
      setJdContentState(result.content);
      setJdFileName(result.originalFileName ?? file.name);
      setJdInputWarning(null);
      const locale = lang === "en" ? "en" : "vi";
      setJdSummary(refineJdSummary(result.content, result.summary, locale));
      addToast("success", tx.jdUploaded.replace("{{name}}", result.originalFileName ?? file.name));
      await refreshPlanAndSettings();
      return true;
    } catch (error) {
      const message = extractErrorMessage(error, lang) || tx.jdUploadFailed;
      if (isJdInputRejectError(error)) {
        setJdInputWarning(message);
        return false;
      }
      setJdInputWarning(null);
      addToast("error", message);
      return false;
    }
  }, [addToast, lang, project, refreshPlanAndSettings, tx.jdUploadFailed, tx.jdUploaded]);

  /** SCRUM-416: lưu vị trí HR sửa (PATCH Title trên BE). */
  const saveJobDescriptionPosition = useCallback(async (position: string) => {
    if (!project) return;
    const trimmed = position.trim();
    if (!trimmed) {
      addToast("error", tx.positionRequired);
      return;
    }
    try {
      const result = await studioApi.updateJobDescriptionPosition(project.id, trimmed);
      setJdSummary((prev) => ({
        detectedRole: result.detectedRole ?? prev?.detectedRole ?? null,
        detectedSeniority: result.detectedSeniority ?? prev?.detectedSeniority ?? null,
        detectedLanguage: result.detectedLanguage ?? prev?.detectedLanguage ?? null,
        skills: result.skills?.length ? result.skills : (prev?.skills ?? []),
        position: result.position?.trim() || trimmed,
      }));
      addToast("success", tx.positionSaved);
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang) || tx.positionSaveFailed);
    }
  }, [addToast, lang, project, tx.positionRequired, tx.positionSaveFailed, tx.positionSaved]);

  /** SCRUM-417: xác nhận Position + Level (+ Role / Skills) trước generate. */
  const saveJobDescriptionMetadata = useCallback(async (payload: {
    position: string;
    detectedSeniority: string;
    detectedRole?: string | null;
    skills?: string[];
  }) => {
    if (!project) return;
    const position = payload.position.trim();
    const seniority = payload.detectedSeniority.trim();
    if (!position) {
      addToast("error", tx.positionRequired);
      return;
    }
    if (!seniority) {
      addToast("error", tx.seniorityRequiredForPlan);
      return;
    }
    try {
      const result = await studioApi.updateJobDescriptionMetadata(project.id, {
        position,
        detectedSeniority: seniority,
        detectedRole: payload.detectedRole,
        skills: payload.skills,
      });
      setJdSummary((prev) => ({
        detectedRole: result.detectedRole ?? payload.detectedRole ?? prev?.detectedRole ?? null,
        detectedSeniority: result.detectedSeniority ?? seniority,
        // Metadata PATCH isn't responsible for language detection — keep whatever
        // was previously detected instead of nulling it out when the response omits it.
        detectedLanguage: result.detectedLanguage ?? prev?.detectedLanguage ?? null,
        skills: result.skills ?? payload.skills ?? prev?.skills ?? [],
        position: result.position?.trim() || position,
        experienceLevel: result.experienceLevel ?? prev?.experienceLevel,
        responsibilities: result.responsibilities ?? prev?.responsibilities,
        summary: result.summary ?? prev?.summary,
      }));
      addToast("success", tx.metadataSaved);
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang) || tx.metadataSaveFailed);
    }
  }, [
    addToast,
    lang,
    project,
    tx.metadataSaveFailed,
    tx.metadataSaved,
    tx.positionRequired,
    tx.seniorityRequiredForPlan,
  ]);

  const uploadDocument = useCallback(async (file: File, documentType?: string) => {
    if (!project) return;
    const uploaded = await studioApi.uploadDocument(project.id, file, true, documentType);
    setDocuments((prev) => [uploaded, ...prev.filter((d) => d.id !== uploaded.id)]);
    await refreshPlanAndSettings();
    addToast("success", tx.docUploaded);
  }, [addToast, project, refreshPlanAndSettings, tx.docUploaded]);

  /** SCRUM-373: gắn doc từ Knowledge Documents đã upload */
  const attachLibraryDocuments = useCallback(async (knowledgeDocumentIds: string[]) => {
    if (!project || knowledgeDocumentIds.length === 0) return;
    try {
      const attached = await studioApi.attachLibraryDocuments(project.id, knowledgeDocumentIds, true);
      setDocuments((prev) => {
        const ids = new Set(attached.map((d) => d.id));
        return [...attached, ...prev.filter((d) => !ids.has(d.id))];
      });
      await refreshPlanAndSettings();
      addToast("success", tx.kbAttached.replace("{{count}}", String(attached.length)));
    } catch (error) {
      const message = error instanceof Error ? error.message : tx.kbAttachFailed;
      addToast("error", message);
      throw error;
    }
  }, [addToast, project, refreshPlanAndSettings, tx.kbAttachFailed, tx.kbAttached]);

  /** SCRUM-443 */
  const fetchKnowledgeSuggestions = useCallback(async () => {
    if (!project) return [] as Awaited<ReturnType<typeof studioApi.suggestKnowledgeDocuments>>;
    try {
      return await studioApi.suggestKnowledgeDocuments(project.id);
    } catch {
      return [];
    }
  }, [project]);

  /** SCRUM-444 */
  const fetchRetrievePreview = useCallback(async (knowledgeDocumentId: string) => {
    if (!project) return null;
    try {
      return await studioApi.retrieveKnowledgePreview(project.id, knowledgeDocumentId);
    } catch {
      return null;
    }
  }, [project]);

  const toggleDocument = useCallback(async (documentId: string, isSelected: boolean) => {
    if (!project) return;
    try {
      const updated = await studioApi.setDocumentSelection(project.id, documentId, isSelected);
      setDocuments((prev) => prev.map((doc) => (doc.id === updated.id ? updated : doc)));
      await refreshPlanAndSettings();
    } catch (error) {
      const message = error instanceof Error ? error.message : tx.docToggleFailed;
      addToast("error", message);
    }
  }, [addToast, project, refreshPlanAndSettings]);

  const generateInitialPlan = useCallback(async () => {
    if (!project) return;
    // SCRUM-416/417: chặn sớm nếu thiếu Position hoặc Level.
    if (!jdSummary?.position?.trim()) {
      addToast("error", tx.positionRequiredForPlan);
      return;
    }
    if (!jdSummary?.detectedSeniority?.trim()) {
      addToast("error", tx.seniorityRequiredForPlan);
      return;
    }
    setIsStreaming(true);
    try {
      setMessages((prev) => [
        ...prev.filter((m) => !m.content.startsWith("Refined message:")),
        {
          id: `local-system-${Date.now()}`,
          sessionId: "",
          role: "Assistant",
          content: "Đang lập plan từ Job Description (RAG)…",
          status: "Streaming",
          createdAt: new Date().toISOString(),
        },
      ]);
      const summary = await studioApi.generatePlan(project.id);
      const detail = await studioApi.getPlanDetail(project.id, summary.id);
      setCurrentPlan(detail);
      await refreshStudioState();
      addToast("success", tx.planCreated);
    } catch (error) {
      const message = extractErrorMessage(error, lang);
      addToast("error", message);
      setMessages((prev) => [
        ...prev.filter((m) => m.status !== "Streaming"),
        {
          id: `local-ai-${Date.now()}`,
          sessionId: "",
          role: "Assistant",
          content: message,
          status: "Failed",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [
    addToast,
    jdSummary?.detectedSeniority,
    jdSummary?.position,
    project,
    refreshStudioState,
    lang,
    tx.planCreated,
    tx.positionRequiredForPlan,
    tx.seniorityRequiredForPlan,
  ]);

  const sendMessage = useCallback(async (message: string) => {
    // SCRUM-368: chat chỉ refine plan qua RAG — không SSE mock
    if (!project || !currentPlan || !message.trim()) return;
    if (currentPlan.status === "Approved") {
      addToast("error", tx.planAlreadyApproved);
      return;
    }
    setIsStreaming(true);
    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      sessionId: "",
      role: "User",
      content: message,
      status: "Completed",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const aiMessageId = `local-ai-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        sessionId: "",
        role: "Assistant",
        content: "Đang retrieve RAG + cập nhật plan…",
        status: "Streaming",
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      const result = await studioApi.refinePlan(project.id, currentPlan.id, message);
      if (result.settings) {
        setSettings(normalizeSettings({
          ...result.settings,
          // BE trả `language`; normalizeSettings map sang outputLanguage
          ...(result.settings as StudioSettings & { language?: string }),
        }));
      }
      await refreshStudioState();
      addToast("success", tx.planRefined);
    } catch (error) {
      const text = extractErrorMessage(error, lang);
      addToast("error", text);
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMessageId ? { ...m, status: "Failed", content: text } : m))
      );
    } finally {
      setIsStreaming(false);
    }
  }, [addToast, currentPlan, normalizeSettings, project, refreshStudioState]);

  const approveCurrentPlan = useCallback(async () => {
    if (!project || !currentPlan) return;
    const planId = currentPlan.id;
    try {
      await studioApi.approvePlan(project.id, currentPlan.id, currentPlan.revision, currentPlan.concurrencyVersion);
      // Giữ plan trên UI (status Approved) — chat refine khóa có chủ đích, không làm mất card
      setCurrentPlan((prev) => (prev ? { ...prev, status: "Approved" } : prev));
      await refreshStudioState();
      const after = (await studioApi.getCurrentPlan(project.id).catch(() => null))
        ?? (await studioApi.getPlanDetail(project.id, planId).catch(() => null));
      if (after) setCurrentPlan(after);
      addToast("success", tx.planApprovedMsg);
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang));
    }
  }, [addToast, currentPlan, project, refreshStudioState]);

  /** SCRUM-393: đổi tên công việc / tiêu đề plan trên PlanWorkspace. */
  const renameCurrentPlanTitle = useCallback(
    async (title: string) => {
      if (!project || !currentPlan) return false;
      const trimmed = title.trim();
      if (!trimmed) {
        addToast("error", tx.planTitleEmpty ?? "Tiêu đề không được để trống.");
        return false;
      }
      try {
        const summary = await studioApi.renamePlanTitle(project.id, currentPlan.id, trimmed);
        setCurrentPlan((prev) => (prev ? { ...prev, title: summary.title || trimmed } : prev));
        setPlans((prev) =>
          prev.map((p) => (p.id === currentPlan.id ? { ...p, title: summary.title || trimmed } : p))
        );
        addToast("success", tx.planTitleRenamed ?? "Đã cập nhật tên công việc.");
        return true;
      } catch (error) {
        addToast("error", extractErrorMessage(error, lang));
        return false;
      }
    },
    [addToast, currentPlan, lang, project, tx.planTitleEmpty, tx.planTitleRenamed]
  );

  const refineCurrentPlan = useCallback(async (instruction: string) => {
    if (!project || !currentPlan || !instruction.trim()) return;
    if (currentPlan.status === "Approved") {
      addToast("error", tx.planAlreadyApproved);
      return;
    }
    setIsStreaming(true);
    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      sessionId: "",
      role: "User",
      content: instruction,
      status: "Completed",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    try {
      addToast("success", tx.planRefining);
      const result = await studioApi.refinePlan(project.id, currentPlan.id, instruction);
      if (result.settings) {
        setSettings(normalizeSettings(result.settings as StudioSettings & { language?: string }));
      }
      await refreshStudioState();
      addToast("success", tx.planRefined);
    } catch (error) {
      const text = extractErrorMessage(error, lang);
      addToast("error", text);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-ai-${Date.now()}`,
          sessionId: "",
          role: "Assistant",
          content: text,
          status: "Failed",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  }, [addToast, currentPlan, normalizeSettings, project, refreshStudioState]);

  const refreshGenerationStatus = useCallback(async () => {
    if (!project) return null;
    const runs = await studioApi.listGenerationRuns(project.id).catch(() => [] as GenerationRun[]);
    const latest = runs[0] ?? null;
    setGenerationRun(latest);
    if (latest?.status === "Completed" && currentPlan) {
      const result = await studioApi
        .listQuestions(project.id, { page: 1, pageSize: 100, planId: currentPlan.id })
        .catch(() => null);
      if (result) setQuestions(result.items);
    }
    return latest;
  }, [currentPlan, project]);

  const generateQuestions = useCallback(async (forceReplace = false) => {
    if (!project || !currentPlan || !settings) return;
    if (isGeneratingQuestions) return;
    setIsGeneratingQuestions(true);
    setQuotaExceeded(false); // reset on each new attempt
    setQuestionsAlreadyExist(false); // P2b: reset confirmation flag
    try {
      let run: GenerationRun;
      try {
        run = await studioApi.generateQuestions(project.id, {
          planId: currentPlan.id,
          replaceExisting: forceReplace,
          includeSampleAnswers: settings.includeSampleAnswers,
          includeScoringRubric: settings.includeScoringRubric,
        });
      } catch (error) {
        const errMsg = extractErrorMessage(error, lang);
        if (errMsg.includes("QUESTIONS_ALREADY_EXIST") || errMsg.includes("questions_already_exist")) {
          // P2b fix: instead of silently auto-retrying with replaceExisting:true,
          // surface the conflict to the user via questionsAlreadyExist state so
          // they can confirm before their manually-edited questions are overwritten.
          setQuestionsAlreadyExist(true);
          return; // will be re-called by confirmReplaceQuestions below
        } else {
          throw error;
        }
      }
      // Ephemeral start toast — center loader is the primary in-progress indicator.
      addToast("success", tx.generationStarted);
      setGenerationRun(run);

      // SCRUM-371: poll generation run tới Completed/Failed (RAG callback)
      // P2a fix: cancellation is checked before each await so the loop exits
      // immediately when the user navigates away instead of running for 5 minutes.
      const pollResult = await pollGenerationRun({
        initialRun: run,
        getGenerationRun: () => studioApi.getGenerationRun(project.id, run.id),
        isCancelled: () => generateCancelledRef.current,
        onTick: setGenerationRun,
      });
      if (pollResult.cancelled) return; // component unmounted — stop all state updates
      const latest = pollResult.latest;

      if (latest.status === "Failed") {
        throw new Error(
          `[${latest.errorCode ?? "FAILED"}] ${latest.errorMessage || "RAG sinh câu hỏi thất bại."}`
        );
      }
      if (latest.status !== "Completed") {
        throw new Error(
          `Job vẫn ${latest.status} sau 5 phút (run ${latest.id.slice(0, 8)}…). RAG có thể chưa callback — bấm Làm mới trạng thái.`
        );
      }

      const result = await studioApi.listQuestions(project.id, { page: 1, pageSize: 100, planId: currentPlan.id });
      if (generateCancelledRef.current) return;
      setQuestions(result.items);
      addToast("success", tx.generationDone.replace("{{count}}", String(result.items.length)));
    } catch (error) {
      if (generateCancelledRef.current) return;
      // Detect BE quota / cooldown error codes (COOLDOWN_ACTIVE, QUOTA_EXCEEDED).
      // When these occur we signal the page component via `quotaExceeded` state so it
      // can show the quota dialog, and we skip the generic error toast.
      const errCode = (error as { response?: { data?: { errorCode?: string } } })
        ?.response?.data?.errorCode;
      if (errCode === "COOLDOWN_ACTIVE" || errCode === "QUOTA_EXCEEDED") {
        setQuotaExceeded(true);
      } else {
        const message = extractErrorMessage(error, lang) || tx.generationFailed;
        addToast("error", message);
      }
      void refreshGenerationStatus();
    } finally {
      if (!generateCancelledRef.current) setIsGeneratingQuestions(false);
    }
  // generateCancelledRef is stable (useRef), so it's intentionally omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToast, currentPlan, isGeneratingQuestions, lang, project, refreshGenerationStatus, settings, tx.generationDone, tx.generationFailed, tx.generationStarted]);

  /** P2b: Called after user confirms the replace-questions dialog. */
  const confirmReplaceQuestions = useCallback(async () => {
    setQuestionsAlreadyExist(false);
    await generateQuestions(true);
  }, [generateQuestions]);

  const updateSettingField = useCallback(async (patch: Partial<StudioSettings>) => {
    // P2c fix: base the computation on settingsRef.current (synchronously kept
    // up to date by this same function, see below) rather than the `settings`
    // closure. Two rapid calls before React re-renders now compose on top of
    // each other instead of the second one reverting the first's change —
    // settingsRef is updated the instant we compute `next`, so a call fired
    // milliseconds later already sees the previous call's optimistic result.
    const base = settingsRef.current ?? settings;
    if (!project || !base) return;
    const rawMinutes = Number(patch.interviewLengthMinutes ?? base.interviewLengthMinutes ?? 60);
    const rawQuestions = Number(patch.numberOfQuestions ?? base.numberOfQuestions ?? 15);
    const next = {
      interviewLengthMinutes: Number.isFinite(rawMinutes) ? Math.min(180, Math.max(15, rawMinutes)) : 60,
      numberOfQuestions: Number.isFinite(rawQuestions) ? Math.min(50, Math.max(5, rawQuestions)) : 15,
      difficulty: patch.difficulty ?? base.difficulty ?? "Medium",
      // Tone/format đã bỏ khỏi UI — luôn gửi default cố định
      questionTone: "Professional",
      includeSampleAnswers: patch.includeSampleAnswers ?? base.includeSampleAnswers ?? true,
      includeScoringRubric: patch.includeScoringRubric ?? base.includeScoringRubric ?? true,
      outputFormat: "StructuredInterviewKit",
      outputLanguage: patch.outputLanguage ?? base.outputLanguage ?? "Vietnamese",
      questionTypes: patch.questionTypes ?? base.questionTypes ?? ["technical", "system_design", "problem_solving", "behavioral"],
      contentMode: patch.contentMode ?? base.contentMode ?? "Mixed",
      enabledCodeTemplates: patch.enabledCodeTemplates ?? base.enabledCodeTemplates ?? DEFAULT_ENABLED_CODE_TEMPLATES,
      focusAreas: patch.focusAreas ?? base.focusAreas ?? [],
      questionDistribution: patch.questionDistribution ?? base.questionDistribution ?? [],
      questionStyles: patch.questionStyles ?? base.questionStyles ?? [],
    };
    // Optimistic update — reflect changes immediately in UI without waiting for API.
    // P2c fix: capture a version number so a slow first request's error rollback
    // does not overwrite the optimistic state of a second faster request that already
    // completed successfully.
    const prevSettings = base;
    const optimistic = { ...base, ...next };
    settingsRef.current = optimistic;
    const myVersion = ++settingsVersionRef.current;
    setSettings(optimistic);
    try {
      const updated = await studioApi.updateSettings(project.id, next);
      // Only apply if no newer request has started since ours.
      if (settingsVersionRef.current !== myVersion) return;
      // Re-apply patch on top so explicit user changes survive if API returns null for a field
      const normalized = normalizeSettings(updated);
      const finalSettings = normalized ? { ...normalized, ...patch } : optimistic;
      settingsRef.current = finalSettings;
      setSettings(finalSettings);
    } catch (error) {
      // Only rollback if no newer request has superseded ours.
      if (settingsVersionRef.current !== myVersion) return;
      settingsRef.current = prevSettings;
      setSettings(prevSettings);
      addToast("error", extractErrorMessage(error, lang));
    }
  }, [addToast, lang, normalizeSettings, project, settings]);

  const recommendConfiguration = useCallback(async () => {
    if (!project) return null;
    setIsRecommendingConfig(true);
    try {
      await studioApi.recommendInterviewConfiguration(project.id, {
        numberOfQuestions: settingsRef.current?.numberOfQuestions ?? settings?.numberOfQuestions,
      });
      const updated = await studioApi.getSettings(project.id);
      const normalized = normalizeSettings(updated);
      settingsRef.current = normalized;
      setSettings(normalized);
      addToast("success", tx.recommendConfigDone);
      return normalized?.recommendedConfiguration ?? null;
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang));
      return null;
    } finally {
      setIsRecommendingConfig(false);
    }
  }, [addToast, lang, normalizeSettings, project, settings?.numberOfQuestions, tx.recommendConfigDone]);


  const applyConfiguration = useCallback(async (
    patch: Partial<StudioSettings>,
    successMessage?: string | false
  ): Promise<boolean> => {
    const base = settingsRef.current ?? settings;
    if (!project || !base) return false;
    setIsApplyingConfig(true);
    try {
      const payload = {
        interviewLengthMinutes: patch.interviewLengthMinutes ?? base.interviewLengthMinutes,
        numberOfQuestions: patch.numberOfQuestions ?? base.numberOfQuestions,
        difficulty: patch.difficulty ?? base.difficulty,
        questionTone: "Professional",
        includeSampleAnswers: patch.includeSampleAnswers ?? base.includeSampleAnswers,
        includeScoringRubric: patch.includeScoringRubric ?? base.includeScoringRubric,
        outputFormat: "StructuredInterviewKit",
        outputLanguage: patch.outputLanguage ?? base.outputLanguage,
        questionTypes: patch.questionTypes ?? base.questionTypes,
        contentMode: patch.contentMode ?? base.contentMode,
        enabledCodeTemplates: patch.enabledCodeTemplates ?? base.enabledCodeTemplates,
        focusAreas: patch.focusAreas ?? base.focusAreas ?? [],
        questionDistribution: patch.questionDistribution ?? base.questionDistribution ?? [],
        questionStyles: patch.questionStyles ?? base.questionStyles ?? [],
      };
      // Optimistic sync panel cơ bản (số câu / độ khó) ngay khi apply
      const optimistic = { ...base, ...payload } as StudioSettings;
      const optimisticNorm = normalizeSettings(optimistic) ?? optimistic;
      settingsRef.current = optimisticNorm;
      setSettings(optimisticNorm);

      const updated = await studioApi.updateSettings(project.id, payload);
      const normalized = normalizeSettings(updated);
      if (normalized) {
        settingsRef.current = normalized;
        setSettings(normalized);
      }
      // successMessage === false → silent (flush trước tạo/duyệt plan)
      if (successMessage !== false) {
        addToast(
          "success",
          successMessage ?? t.studioPage.settings.config.configAppliedSuccess
        );
      }
      return true;
    } catch (error) {
      settingsRef.current = base;
      setSettings(base);
      addToast("error", extractErrorMessage(error, lang));
      return false;
    } finally {
      setIsApplyingConfig(false);
    }
  }, [addToast, lang, normalizeSettings, project, settings, t.studioPage.settings.config.configAppliedSuccess]);

  const applyRecommendation = useCallback(async (): Promise<boolean> => {
    const rec = settingsRef.current?.recommendedConfiguration ?? settings?.recommendedConfiguration;
    if (!rec || !project) {
      addToast("error", tx.recommendConfigMissing);
      return false;
    }
    const base = settingsRef.current ?? settings;
    if (!base) return false;

    setIsApplyingRecommendation(true);
    try {
      const patch = buildApplyRecommendationPatch(rec);
      return await applyConfiguration(
        {
          interviewLengthMinutes: base.interviewLengthMinutes,
          numberOfQuestions: patch.numberOfQuestions ?? base.numberOfQuestions,
          difficulty: patch.difficulty ?? base.difficulty,
          questionTone: "Professional",
          includeSampleAnswers: base.includeSampleAnswers,
          includeScoringRubric: base.includeScoringRubric,
          outputFormat: "StructuredInterviewKit",
          outputLanguage: base.outputLanguage,
          contentMode: base.contentMode,
          questionTypes: patch.questionTypes ?? base.questionTypes,
          enabledCodeTemplates: patch.enabledCodeTemplates ?? base.enabledCodeTemplates,
          focusAreas: patch.focusAreas ?? [],
          questionDistribution: patch.questionDistribution ?? [],
          questionStyles: patch.questionStyles ?? [],
        },
        tx.recommendConfigApplied
      );
    } finally {
      setIsApplyingRecommendation(false);
    }
  }, [
    addToast,
    applyConfiguration,
    project,
    settings,
    tx.recommendConfigApplied,
    tx.recommendConfigMissing,
  ]);

  const applySettingsToPlan = useCallback(async (outlineItems?: ApplyPlanSettingsPayload["outlineItems"]) => {
    const live = settingsRef.current ?? settings;
    if (!project || !currentPlan || !live) return;
    if (currentPlan.status === "Approved") {
      addToast("error", tx.planApprovedNoSettings);
      return;
    }
    setIsApplyingSettings(true);
    setIsStreaming(true);
    try {
      const payload: ApplyPlanSettingsPayload = {
        numberOfQuestions: outlineItems?.length
          ? outlineItems.length
          : live.numberOfQuestions || 15,
        difficulty: live.difficulty || "Medium",
        interviewLengthMinutes: live.interviewLengthMinutes || 60,
        questionTypes:
          live.questionTypes?.length > 0
            ? live.questionTypes
            : ["technical", "system_design", "problem_solving", "behavioral"],
        questionDistribution: live.questionDistribution,
        focusAreas: live.focusAreas,
        questionStyles: live.questionStyles,
        codingTaskTypes: (live.enabledCodeTemplates ?? []).filter((t) => t !== "SYSTEM_DESIGN"),
        outlineItems: outlineItems?.length ? outlineItems : undefined,
      };
      addToast("success", tx.applyingSettings);
      await studioApi.applyPlanSettings(project.id, currentPlan.id, payload);
      await refreshStudioState();
      addToast("success", tx.settingsApplied);
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang));
    } finally {
      setIsApplyingSettings(false);
      setIsStreaming(false);
    }
  }, [addToast, currentPlan, lang, project, refreshStudioState, settings, tx.applyingSettings, tx.planApprovedNoSettings, tx.settingsApplied]);

  const saveDraftAction = useCallback(async () => {
    if (!project || isSavingDraft) return;
    setIsSavingDraft(true);
    try {
      const result = await studioApi.saveDraft(project.id);
      const updated = await studioApi.getProject(project.id);
      setProject({
        ...updated,
        questionSetId: result.questionSetId ?? updated.questionSetId ?? null,
      });
      setIsDraftSaved(true);
      addToast("success", tx.saved ?? tx.draftSaved);
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang) || tx.draftSaveFailed);
    } finally {
      setIsSavingDraft(false);
    }
  }, [addToast, isSavingDraft, project, lang, tx.draftSaveFailed, tx.draftSaved, tx.saved]);

  const togglePublish = useCallback(async (opts?: {
    interviewQuestionIds?: string[];
    timeLimitMinutes?: number | null;
    autoRecommendEnabled?: boolean;
    recommendationMinScore?: number;
  }): Promise<boolean> => {
    if (!project) return false;
    try {
      if (project.isPublished) {
        const abandoned = await studioApi.unpublishProject(project.id);
        const updated = await studioApi.getProject(project.id);
        setProject(updated);
        addToast(
          "success",
          abandoned > 0 ? `${tx.unpublished} Đã hủy ${abandoned} phiên đang làm.` : tx.unpublished
        );
      } else {
        // SCRUM-439: BE Save subset + Publish + time limit + recommend
        await studioApi.publishProject(project.id, {
          interviewQuestionIds: opts?.interviewQuestionIds,
          timeLimitMinutes: opts?.timeLimitMinutes ?? null,
          autoRecommendEnabled: opts?.autoRecommendEnabled,
          recommendationMinScore: opts?.recommendationMinScore,
        });
        const updated = await studioApi.getProject(project.id);
        setProject(updated);
        addToast("success", tx.published);
      }
      return true;
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang));
      return false;
    }
  }, [addToast, project, lang, tx.published, tx.unpublished]);

  const createShare = useCallback(async () => {
    if (!project) return;
    // P1b fix: wrap in try/catch so share/clipboard errors produce an error toast.
    try {
      const share = await studioApi.createShareLink(project.id, "View");
      const link = `${window.location.origin}/api/studio/shared/${share.token}`;
      await navigator.clipboard.writeText(link);
      addToast("success", tx.shareCreated);
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang) || tx.shareCreateFailed);
    }
  }, [addToast, lang, project, tx.shareCreateFailed, tx.shareCreated]);

  const createNewSession = useCallback(async () => {
    try {
      setLoading(true);
      const stamp = new Date().toLocaleString("vi-VN");
      const created = await studioApi.createProject(`Interview Plan ${stamp}`, "Bộ mới — Tạo câu hỏi v2");
      // Normalize id (BE có thể trả Id) rồi persist — SCRUM-402
      const createdId =
        (created as { id?: string; Id?: string }).id
        ?? (created as { Id?: string }).Id
        ?? "";
      if (createdId) persistActiveProjectId(createdId);
      setProject({ ...created, id: createdId || created.id });
      setJdContent("");
      setJdFileName(null);
      setJdSummary(null);
      setDocuments([]);
      setPlans([]);
      setCurrentPlan(null);
      setSettings(null);
      // Bug fix: reset synchronously (not just via the settings-changed sync
      // effect, which only runs after this render commits) so an
      // updateSettingField call already in flight for the OLD project can't
      // resolve after this switch and write stale cross-project settings —
      // settingsVersionRef bump invalidates its version check, settingsRef
      // reset means any subsequent call builds from a clean base.
      settingsRef.current = null;
      settingsVersionRef.current += 1;
      setQuestions([]);
      setMessages([]);
      setGenerationRun(null);
      setIsGeneratingQuestions(false);
      addToast("success", tx.newSessionCreated);
    } catch (error) {
      addToast("error", extractErrorMessage(error, lang));
    } finally {
      setLoading(false);
    }
  }, [addToast, lang, tx.newSessionCreated]);

  const value = useMemo(
    () => ({
      loading,
      project,
      jdContent,
      setJdContent,
      jdFileName,
      jdInputWarning,
      jdSummary,
      documents,
      plans,
      currentPlan,
      settings,
      questions,
      messages,
      isStreaming,
      isApplyingSettings,
      isRecommendingConfig,
      isApplyingRecommendation,
      isApplyingConfig,
      generationRun,
      isGeneratingQuestions,
      quotaExceeded,
      questionsAlreadyExist,
      isSavingDraft,
      isDraftSaved,
      saveJobDescription,
      saveJobDescriptionPosition,
      saveJobDescriptionMetadata,
      uploadJobDescription,
      uploadDocument,
      attachLibraryDocuments,
      fetchKnowledgeSuggestions,
      fetchRetrievePreview,
      toggleDocument,
      generateInitialPlan,
      sendMessage,
      approveCurrentPlan,
      renameCurrentPlanTitle,
      refineCurrentPlan,
      applySettingsToPlan,
      recommendConfiguration,
      applyRecommendation,
      applyConfiguration,
      generateQuestions,
      confirmReplaceQuestions,
      refreshGenerationStatus,
      updateSettingField,
      saveDraftAction,
      togglePublish,
      createShare,
      createNewSession,
      refreshPlanAndSettings,
      setQuestions,
    }),
    [
      approveCurrentPlan,
      renameCurrentPlanTitle,
      confirmReplaceQuestions,
      createNewSession,
      createShare,
      currentPlan,
      documents,
      generateInitialPlan,
      generateQuestions,
      generationRun,
      isApplyingSettings,
      isGeneratingQuestions,
      quotaExceeded,
      questionsAlreadyExist,
      isSavingDraft,
      isDraftSaved,
      isStreaming,
      jdContent,
      jdFileName,
      jdInputWarning,
      jdSummary,
      loading,
      messages,
      plans,
      project,
      questions,
      refreshGenerationStatus,
      refreshPlanAndSettings,
      refineCurrentPlan,
      applySettingsToPlan,
      applyRecommendation,
      applyConfiguration,
      recommendConfiguration,
      isApplyingRecommendation,
      isApplyingConfig,
      isRecommendingConfig,
      saveDraftAction,
      togglePublish,
      saveJobDescription,
      saveJobDescriptionPosition,
      saveJobDescriptionMetadata,
      sendMessage,
      settings,
      toggleDocument,
      updateSettingField,
      uploadDocument,
      attachLibraryDocuments,
      fetchKnowledgeSuggestions,
      fetchRetrievePreview,
      uploadJobDescription,
    ]
  );

  return value;
}

