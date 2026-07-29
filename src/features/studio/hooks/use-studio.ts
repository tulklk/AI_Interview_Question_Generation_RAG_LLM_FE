"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/shared/providers/toast-context";
import { useLanguage } from "@/shared/providers/language-context";
import { extractErrorMessage } from "@/core/interceptors/error.interceptor";
import * as studioApi from "@/features/studio/services/studio.service";
import type {
  AnalyzeJobDescriptionResponse,
  ChatMessage,
  GenerationRun,
  PlanDetail,
  PlanSummary,
  StudioDocument,
  StudioProject,
  StudioQuestion,
  StudioSettings,
} from "@/features/studio/types/studio.types";
import type { ApplyPlanSettingsPayload } from "@/features/studio/types/studio.types";

const STUDIO_TASK_KEY = "studio_active_task";

function broadcastStudioTask(task: "streaming" | "generating" | null) {
  try {
    if (task) localStorage.setItem(STUDIO_TASK_KEY, task);
    else localStorage.removeItem(STUDIO_TASK_KEY);
    window.dispatchEvent(new CustomEvent("studio:task-changed", { detail: { task } }));
  } catch { /* ignore */ }
}

export function useStudio() {
  const { addToast } = useToast();
  const { t } = useLanguage();
  const tx = t.studioPage.toasts;
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [jdContent, setJdContent] = useState("");
  const [jdFileName, setJdFileName] = useState<string | null>(null);
  const [jdSummary, setJdSummary] = useState<AnalyzeJobDescriptionResponse | null>(null);
  const [documents, setDocuments] = useState<StudioDocument[]>([]);
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [currentPlan, setCurrentPlan] = useState<PlanDetail | null>(null);
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [questions, setQuestions] = useState<StudioQuestion[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isApplyingSettings, setIsApplyingSettings] = useState(false);
  const [generationRun, setGenerationRun] = useState<GenerationRun | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  useEffect(() => {
    if (isStreaming) broadcastStudioTask("streaming");
    else if (isGeneratingQuestions) broadcastStudioTask("generating");
    else broadcastStudioTask(null);
  }, [isStreaming, isGeneratingQuestions]);

  const normalizeSettings = useCallback((s: StudioSettings | null): StudioSettings | null => {
    if (!s) return null;
    const minutes = Number(s.interviewLengthMinutes);
    const questions = Number(s.numberOfQuestions);
    return {
      ...s,
      interviewLengthMinutes: Number.isFinite(minutes) && minutes >= 15 && minutes <= 180 ? minutes : 60,
      numberOfQuestions: Number.isFinite(questions) && questions >= 5 && questions <= 50 ? questions : 15,
      difficulty: s.difficulty ?? "Medium",
      questionTone: s.questionTone ?? "Professional",
      includeSampleAnswers: s.includeSampleAnswers ?? true,
      includeScoringRubric: s.includeScoringRubric ?? true,
      outputFormat: s.outputFormat ?? "StructuredInterviewKit",
      outputLanguage: s.outputLanguage ?? "Vietnamese",
      questionTypes:
        Array.isArray(s.questionTypes) && s.questionTypes.length > 0
          ? s.questionTypes
          : ["technical", "system_design", "problem_solving", "behavioral"],
    };
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      let ownedProjects = await studioApi.listProjects();
      if (ownedProjects.length === 0) {
        await studioApi.createProject("Interview Plan Studio", "Project mặc định cho Tạo câu hỏi v2");
        ownedProjects = await studioApi.listProjects();
      }

      const target = ownedProjects[0] ?? null;
      setProject(target);
      if (!target) return;

      const [summary, docs, plan, studioSettings, chatMessages, planList, runs] = await Promise.all([
        studioApi.getJobDescription(target.id).catch(() => null),
        studioApi.listDocuments(target.id).catch(() => []),
        studioApi.getCurrentPlan(target.id).catch(() => null),
        studioApi.getSettings(target.id).catch(() => null),
        studioApi.getChatMessages(target.id).catch(() => []),
        studioApi.listPlans(target.id).catch(() => []),
        studioApi.listGenerationRuns(target.id).catch(() => [] as GenerationRun[]),
      ]);

      if (summary) {
        setJdContent(summary.content ?? "");
        setJdFileName(
          summary.sourceType === "UploadedFile" ? (summary.originalFileName ?? null) : null
        );
        setJdSummary(summary.summary ?? {
          detectedRole: null,
          detectedSeniority: null,
          detectedLanguage: null,
          skills: [],
        });
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
        const qs = await studioApi.listQuestions(target.id, { page: 1, pageSize: 100, planId: plan.id }).catch(() => null);
        if (qs) setQuestions(qs.items);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tx.loadFailed;
      addToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [addToast, normalizeSettings]);

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
    setSettings((prev) => {
      if (!studioSettings) return prev;
      const merged = prev
        ? ({
            ...prev,
            ...Object.fromEntries(Object.entries(studioSettings).filter(([, v]) => v != null)),
            // Output preference fields are only changed by the user (updateSettingField) or initial bootstrap.
            // Never overwrite them from a mid-session refresh — the backend may return stale/default values.
            outputLanguage: prev.outputLanguage,
            questionTone: prev.questionTone,
            outputFormat: prev.outputFormat,
            includeSampleAnswers: prev.includeSampleAnswers,
            includeScoringRubric: prev.includeScoringRubric,
          } as typeof studioSettings)
        : studioSettings;
      return normalizeSettings(merged);
    });
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
    await studioApi.upsertJobDescription(project.id, jdContent, "PastedText");
    const summary = await studioApi.analyzeJobDescription(project.id);
    setJdFileName(null);
    setJdSummary(summary);
    addToast("success", tx.jdSaved);
    await refreshPlanAndSettings();
  }, [addToast, jdContent, project, refreshPlanAndSettings]);

  const uploadJobDescription = useCallback(async (file: File) => {
    if (!project) return;
    const result = await studioApi.uploadJobDescriptionFile(project.id, file);
    setJdContent(result.content);
    setJdFileName(result.originalFileName ?? file.name);
    setJdSummary(result.summary);
    addToast("success", tx.jdUploaded.replace("{{name}}", result.originalFileName ?? file.name));
    await refreshPlanAndSettings();
  }, [addToast, project, refreshPlanAndSettings]);

  const uploadDocument = useCallback(async (file: File) => {
    if (!project) return;
    const uploaded = await studioApi.uploadDocument(project.id, file, true);
    setDocuments((prev) => [uploaded, ...prev.filter((d) => d.id !== uploaded.id)]);
    await refreshPlanAndSettings();
    addToast("success", tx.docUploaded);
  }, [addToast, project, refreshPlanAndSettings]);

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
  }, [addToast, project, refreshPlanAndSettings]);

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
    setIsStreaming(true);
    try {
      addToast("success", tx.planCreating);
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
      const message = extractErrorMessage(error);
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
  }, [addToast, project, refreshStudioState]);

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
      await studioApi.refinePlan(project.id, currentPlan.id, message);
      await refreshStudioState();
      addToast("success", tx.planRefined);
    } catch (error) {
      const text = extractErrorMessage(error);
      addToast("error", text);
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMessageId ? { ...m, status: "Failed", content: text } : m))
      );
    } finally {
      setIsStreaming(false);
    }
  }, [addToast, currentPlan, project, refreshStudioState]);

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
      addToast("error", extractErrorMessage(error));
    }
  }, [addToast, currentPlan, project, refreshStudioState]);

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
      await studioApi.refinePlan(project.id, currentPlan.id, instruction);
      await refreshStudioState();
      addToast("success", tx.planRefined);
    } catch (error) {
      const text = extractErrorMessage(error);
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
  }, [addToast, currentPlan, project, refreshStudioState]);

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

  const generateQuestions = useCallback(async () => {
    if (!project || !currentPlan || !settings) return;
    if (isGeneratingQuestions) return;
    setIsGeneratingQuestions(true);
    try {
      let run: GenerationRun;
      try {
        run = await studioApi.generateQuestions(project.id, {
          planId: currentPlan.id,
          replaceExisting: false,
          includeSampleAnswers: settings.includeSampleAnswers,
          includeScoringRubric: settings.includeScoringRubric,
        });
      } catch (error) {
        const errMsg = extractErrorMessage(error);
        if (errMsg.includes("QUESTIONS_ALREADY_EXIST") || errMsg.includes("questions_already_exist")) {
          run = await studioApi.generateQuestions(project.id, {
            planId: currentPlan.id,
            replaceExisting: true,
            includeSampleAnswers: settings.includeSampleAnswers,
            includeScoringRubric: settings.includeScoringRubric,
          });
        } else {
          throw error;
        }
      }
      addToast("success", tx.generationStarted);

      setGenerationRun(run);

      // SCRUM-371: poll generation run tới Completed/Failed (RAG callback)
      const deadline = Date.now() + 5 * 60_000;
      let latest = run;
      while (Date.now() < deadline) {
        if (latest.status === "Completed" || latest.status === "Failed" || latest.status === "Cancelled") break;
        await new Promise((r) => setTimeout(r, 2500));
        latest = await studioApi.getGenerationRun(project.id, run.id);
        setGenerationRun(latest);
      }

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
      setQuestions(result.items);
      addToast("success", tx.generationDone.replace("{{count}}", String(result.items.length)));
    } catch (error) {
      const message = extractErrorMessage(error) || tx.generationFailed;
      addToast("error", message);
      void refreshGenerationStatus();
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [addToast, currentPlan, isGeneratingQuestions, project, refreshGenerationStatus, settings]);

  const updateSettingField = useCallback(async (patch: Partial<StudioSettings>) => {
    if (!project || !settings) return;
    const rawMinutes = Number(patch.interviewLengthMinutes ?? settings.interviewLengthMinutes ?? 60);
    const rawQuestions = Number(patch.numberOfQuestions ?? settings.numberOfQuestions ?? 15);
    const next = {
      interviewLengthMinutes: Number.isFinite(rawMinutes) ? Math.min(180, Math.max(15, rawMinutes)) : 60,
      numberOfQuestions: Number.isFinite(rawQuestions) ? Math.min(50, Math.max(5, rawQuestions)) : 15,
      difficulty: patch.difficulty ?? settings.difficulty ?? "Medium",
      questionTone: patch.questionTone ?? settings.questionTone ?? "Professional",
      includeSampleAnswers: patch.includeSampleAnswers ?? settings.includeSampleAnswers ?? true,
      includeScoringRubric: patch.includeScoringRubric ?? settings.includeScoringRubric ?? true,
      outputFormat: patch.outputFormat ?? settings.outputFormat ?? "StructuredInterviewKit",
      outputLanguage: patch.outputLanguage ?? settings.outputLanguage ?? "Vietnamese",
      questionTypes: patch.questionTypes ?? settings.questionTypes ?? ["technical", "system_design", "problem_solving", "behavioral"],
    };
    // Optimistic update — reflect changes immediately in UI without waiting for API
    const prevSettings = settings;
    setSettings((prev) => prev ? { ...prev, ...next } : prev);
    try {
      const updated = await studioApi.updateSettings(project.id, next);
      // Re-apply patch on top so explicit user changes survive if API returns null for a field
      setSettings((prev) => {
        const normalized = normalizeSettings(updated);
        return normalized ? { ...normalized, ...patch } : prev;
      });
    } catch (error) {
      setSettings(prevSettings);
      addToast("error", extractErrorMessage(error));
    }
  }, [addToast, normalizeSettings, project, settings]);

  const applySettingsToPlan = useCallback(async () => {
    if (!project || !currentPlan || !settings) return;
    if (currentPlan.status === "Approved") {
      addToast("error", tx.planApprovedNoSettings);
      return;
    }
    setIsApplyingSettings(true);
    setIsStreaming(true);
    try {
      const payload: ApplyPlanSettingsPayload = {
        numberOfQuestions: settings.numberOfQuestions || 15,
        difficulty: settings.difficulty || "Medium",
        interviewLengthMinutes: settings.interviewLengthMinutes || 60,
        questionTypes:
          settings.questionTypes?.length > 0
            ? settings.questionTypes
            : ["technical", "system_design", "problem_solving", "behavioral"],
      };
      addToast("success", tx.applyingSettings);
      await studioApi.applyPlanSettings(project.id, currentPlan.id, payload);
      await refreshStudioState();
      addToast("success", tx.settingsApplied);
    } catch (error) {
      addToast("error", extractErrorMessage(error));
    } finally {
      setIsApplyingSettings(false);
      setIsStreaming(false);
    }
  }, [addToast, currentPlan, project, refreshStudioState, settings]);

  const saveDraftAction = useCallback(async () => {
    if (!project) return;
    try {
      await studioApi.saveDraft(project.id);
      // Refresh project to reliably pick up the questionSetId assigned by the backend
      const updated = await studioApi.getProject(project.id);
      setProject(updated);
      addToast("success", tx.draftSaved);
    } catch (error) {
      addToast("error", extractErrorMessage(error) || tx.draftSaveFailed);
    }
  }, [addToast, project]);

  const togglePublish = useCallback(async () => {
    if (!project) return;
    try {
      let questionSetId = project.questionSetId;

      // Auto-save draft if questionSetId is missing so publish can proceed
      if (!questionSetId) {
        await studioApi.saveDraft(project.id);
        const updated = await studioApi.getProject(project.id);
        setProject(updated);
        questionSetId = updated.questionSetId ?? null;
      }

      if (!questionSetId) {
        addToast("error", tx.publishNotFound);
        return;
      }

      if (project.isPublished) {
        await studioApi.unpublishProject(questionSetId);
        setProject((prev) => prev ? { ...prev, isPublished: false } : prev);
        addToast("success", tx.unpublished);
      } else {
        await studioApi.publishProject(questionSetId);
        setProject((prev) => prev ? { ...prev, isPublished: true } : prev);
        addToast("success", tx.published);
      }
    } catch (error) {
      addToast("error", extractErrorMessage(error));
    }
  }, [addToast, project]);

  const createShare = useCallback(async () => {
    if (!project) return;
    const share = await studioApi.createShareLink(project.id, "View");
    const link = `${window.location.origin}/api/studio/shared/${share.token}`;
    await navigator.clipboard.writeText(link);
    addToast("success", tx.shareCreated);
  }, [addToast, project]);

  const createNewSession = useCallback(async () => {
    try {
      setLoading(true);
      const stamp = new Date().toLocaleString("vi-VN");
      const created = await studioApi.createProject(`Interview Plan ${stamp}`, "Bộ mới — Tạo câu hỏi v2");
      setProject(created);
      setJdContent("");
      setJdFileName(null);
      setJdSummary(null);
      setDocuments([]);
      setPlans([]);
      setCurrentPlan(null);
      setSettings(null);
      setQuestions([]);
      setMessages([]);
      setGenerationRun(null);
      setIsGeneratingQuestions(false);
      addToast("success", tx.newSessionCreated);
    } catch (error) {
      addToast("error", extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const value = useMemo(
    () => ({
      loading,
      project,
      jdContent,
      setJdContent,
      jdFileName,
      jdSummary,
      documents,
      plans,
      currentPlan,
      settings,
      questions,
      messages,
      isStreaming,
      isApplyingSettings,
      generationRun,
      isGeneratingQuestions,
      saveJobDescription,
      uploadJobDescription,
      uploadDocument,
      attachLibraryDocuments,
      toggleDocument,
      generateInitialPlan,
      sendMessage,
      approveCurrentPlan,
      refineCurrentPlan,
      applySettingsToPlan,
      generateQuestions,
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
      createNewSession,
      createShare,
      currentPlan,
      documents,
      generateInitialPlan,
      generateQuestions,
      generationRun,
      isApplyingSettings,
      isGeneratingQuestions,
      isStreaming,
      jdContent,
      jdFileName,
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
      saveDraftAction,
      togglePublish,
      saveJobDescription,
      sendMessage,
      settings,
      toggleDocument,
      updateSettingField,
      uploadDocument,
      attachLibraryDocuments,
      uploadJobDescription,
    ]
  );

  return value;
}

