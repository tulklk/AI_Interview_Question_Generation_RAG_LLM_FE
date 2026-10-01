import { apiClient } from "@/core/api/http-client";

/** SCRUM-488: Admin scoring + coach drill policy. */
export interface CompetencyScoringPolicy {
  correctnessWeight: number;
  relevanceWeight: number;
  clarityWeight: number;
  easyDifficultyWeight: number;
  mediumDifficultyWeight: number;
  hardDifficultyWeight: number;
  developingMaxExclusive: number;
  nearTargetMaxExclusive: number;
  readyMaxExclusive: number;
  juniorReadyCoreSkillRatio: number;
  overallReadyThreshold: number;
  targetScoreByLevelJson?: string | null;
  drillPassScoreExclusiveMin: number;
  drillQuestionCountWeak: number;
  drillQuestionCountMid: number;
  drillQuestionCountStrong: number;
  drillWeakBandRatio: number;
  drillRemixEnabled: boolean;
  drillRemixRatio: number;
  drillWeakAnswerScoreMaxExclusive: number;
  diagnosticQuestionsPerSkill: number;
  diagnosticMinSkills: number;
  diagnosticMaxSkills: number;
  diagnosticMaxAdaptiveSkills: number;
  diagnosticMinTotalQuestions: number;
  screeningEnabled: boolean;
  screeningQuestionsPerSkill: number;
  screeningMaxSkills: number;
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val && typeof val === "object" ? (val as Record<string, unknown>) : null;
}

function unwrapEnvelope(raw: unknown): Record<string, unknown> {
  const root = asRecord(raw);
  if (!root) return {};
  return asRecord(root.data) ?? asRecord(root.Data) ?? root;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return 0;
}

function pickBool(obj: Record<string, unknown>, fallback: boolean, ...keys: string[]): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
  }
  return fallback;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return null;
}

function normalize(raw: unknown): CompetencyScoringPolicy {
  const d = unwrapEnvelope(raw);
  return {
    correctnessWeight: pickNumber(d, "correctnessWeight", "CorrectnessWeight") || 0.5,
    relevanceWeight: pickNumber(d, "relevanceWeight", "RelevanceWeight") || 0.3,
    clarityWeight: pickNumber(d, "clarityWeight", "ClarityWeight") || 0.2,
    easyDifficultyWeight: pickNumber(d, "easyDifficultyWeight", "EasyDifficultyWeight") || 1,
    mediumDifficultyWeight: pickNumber(d, "mediumDifficultyWeight", "MediumDifficultyWeight") || 1.5,
    hardDifficultyWeight: pickNumber(d, "hardDifficultyWeight", "HardDifficultyWeight") || 2,
    developingMaxExclusive: pickNumber(d, "developingMaxExclusive", "DevelopingMaxExclusive") || 50,
    nearTargetMaxExclusive: pickNumber(d, "nearTargetMaxExclusive", "NearTargetMaxExclusive") || 70,
    readyMaxExclusive: pickNumber(d, "readyMaxExclusive", "ReadyMaxExclusive") || 85,
    juniorReadyCoreSkillRatio: pickNumber(d, "juniorReadyCoreSkillRatio", "JuniorReadyCoreSkillRatio") || 0.7,
    overallReadyThreshold: pickNumber(d, "overallReadyThreshold", "OverallReadyThreshold") || 70,
    targetScoreByLevelJson: pickString(d, "targetScoreByLevelJson", "TargetScoreByLevelJson"),
    drillPassScoreExclusiveMin: pickNumber(d, "drillPassScoreExclusiveMin", "DrillPassScoreExclusiveMin") || 70,
    drillQuestionCountWeak: pickNumber(d, "drillQuestionCountWeak", "DrillQuestionCountWeak") || 20,
    drillQuestionCountMid: pickNumber(d, "drillQuestionCountMid", "DrillQuestionCountMid") || 15,
    drillQuestionCountStrong: pickNumber(d, "drillQuestionCountStrong", "DrillQuestionCountStrong") || 10,
    drillWeakBandRatio: pickNumber(d, "drillWeakBandRatio", "DrillWeakBandRatio") || 0.6,
    drillRemixEnabled: pickBool(d, true, "drillRemixEnabled", "DrillRemixEnabled"),
    drillRemixRatio: pickNumber(d, "drillRemixRatio", "DrillRemixRatio") || 0.35,
    drillWeakAnswerScoreMaxExclusive:
      pickNumber(d, "drillWeakAnswerScoreMaxExclusive", "DrillWeakAnswerScoreMaxExclusive") || 50,
    diagnosticQuestionsPerSkill: pickNumber(d, "diagnosticQuestionsPerSkill", "DiagnosticQuestionsPerSkill") || 3,
    diagnosticMinSkills: pickNumber(d, "diagnosticMinSkills", "DiagnosticMinSkills") || 3,
    diagnosticMaxSkills: pickNumber(d, "diagnosticMaxSkills", "DiagnosticMaxSkills") || 5,
    diagnosticMaxAdaptiveSkills:
      pickNumber(d, "diagnosticMaxAdaptiveSkills", "DiagnosticMaxAdaptiveSkills") || 8,
    diagnosticMinTotalQuestions:
      pickNumber(d, "diagnosticMinTotalQuestions", "DiagnosticMinTotalQuestions") || 0,
    screeningEnabled: pickBool(d, true, "screeningEnabled", "ScreeningEnabled"),
    screeningQuestionsPerSkill:
      pickNumber(d, "screeningQuestionsPerSkill", "ScreeningQuestionsPerSkill") || 1,
    screeningMaxSkills: pickNumber(d, "screeningMaxSkills", "ScreeningMaxSkills") || 12,
  };
}

export async function getCompetencyScoringPolicy(): Promise<CompetencyScoringPolicy> {
  const res = await apiClient.get("/api/admin/competency-policies/scoring");
  return normalize(res.data);
}

export async function updateCompetencyScoringPolicy(
  payload: CompetencyScoringPolicy
): Promise<CompetencyScoringPolicy> {
  const res = await apiClient.put("/api/admin/competency-policies/scoring", {
    CorrectnessWeight: payload.correctnessWeight,
    RelevanceWeight: payload.relevanceWeight,
    ClarityWeight: payload.clarityWeight,
    EasyDifficultyWeight: payload.easyDifficultyWeight,
    MediumDifficultyWeight: payload.mediumDifficultyWeight,
    HardDifficultyWeight: payload.hardDifficultyWeight,
    DevelopingMaxExclusive: payload.developingMaxExclusive,
    NearTargetMaxExclusive: payload.nearTargetMaxExclusive,
    ReadyMaxExclusive: payload.readyMaxExclusive,
    JuniorReadyCoreSkillRatio: payload.juniorReadyCoreSkillRatio,
    OverallReadyThreshold: payload.overallReadyThreshold,
    TargetScoreByLevelJson: payload.targetScoreByLevelJson,
    DrillPassScoreExclusiveMin: payload.drillPassScoreExclusiveMin,
    DrillQuestionCountWeak: payload.drillQuestionCountWeak,
    DrillQuestionCountMid: payload.drillQuestionCountMid,
    DrillQuestionCountStrong: payload.drillQuestionCountStrong,
    DrillWeakBandRatio: payload.drillWeakBandRatio,
    DrillRemixEnabled: payload.drillRemixEnabled,
    DrillRemixRatio: payload.drillRemixRatio,
    DrillWeakAnswerScoreMaxExclusive: payload.drillWeakAnswerScoreMaxExclusive,
    DiagnosticQuestionsPerSkill: payload.diagnosticQuestionsPerSkill,
    DiagnosticMinSkills: payload.diagnosticMinSkills,
    DiagnosticMaxSkills: payload.diagnosticMaxSkills,
    DiagnosticMaxAdaptiveSkills: payload.diagnosticMaxAdaptiveSkills,
    DiagnosticMinTotalQuestions: payload.diagnosticMinTotalQuestions,
    ScreeningEnabled: payload.screeningEnabled,
    ScreeningQuestionsPerSkill: payload.screeningQuestionsPerSkill,
    ScreeningMaxSkills: payload.screeningMaxSkills,
  });
  return normalize(res.data);
}
