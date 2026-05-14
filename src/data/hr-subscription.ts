import type { HrFeatureId, HrPlanDefinition, HrPlanId } from "@/types/hr-subscription";
import { usageStats } from "@/data/settings";

export const HR_PLAN_IDS: HrPlanId[] = ["basic", "professional", "business", "enterprise"];

/** Maps legacy stored plan ids to the current IQGS tier ids */
export const LEGACY_HR_PLAN_IDS: Record<string, HrPlanId> = {
  free: "basic",
  starter: "professional",
  pro: "business",
  enterprise: "enterprise",
};

export const HR_PLANS: Record<HrPlanId, HrPlanDefinition> = {
  basic: {
    id: "basic",
    priceUsd: 0,
    features: {
      aiPoweredGeneration: false,
      advancedModels: false,
      pdfExport: false,
      docxExport: false,
      batchGenerate: false,
      prioritySupport: false,
      apiAccess: false,
    },
    limits: {
      jdsPerMonth: 0,
      questionsPerMonth: 80,
      pdfExportsPerMonth: 0,
      docxExportsPerMonth: 0,
      historyRetentionDays: 30,
      maxSeats: 1,
      maxQuestionsPerRun: 10,
      publishedBrandedSetsPerMonth: 0,
    },
  },
  professional: {
    id: "professional",
    priceUsd: 29,
    recommended: true,
    features: {
      aiPoweredGeneration: true,
      advancedModels: false,
      pdfExport: true,
      docxExport: false,
      batchGenerate: true,
      prioritySupport: false,
      apiAccess: false,
    },
    limits: {
      jdsPerMonth: 50,
      questionsPerMonth: 800,
      pdfExportsPerMonth: 40,
      docxExportsPerMonth: 0,
      historyRetentionDays: 180,
      maxSeats: 3,
      maxQuestionsPerRun: 18,
      publishedBrandedSetsPerMonth: 20,
    },
  },
  business: {
    id: "business",
    priceUsd: 79,
    features: {
      aiPoweredGeneration: true,
      advancedModels: true,
      pdfExport: true,
      docxExport: true,
      batchGenerate: true,
      prioritySupport: true,
      apiAccess: false,
    },
    limits: {
      jdsPerMonth: 200,
      questionsPerMonth: 4000,
      pdfExportsPerMonth: 120,
      docxExportsPerMonth: 80,
      historyRetentionDays: 730,
      maxSeats: 10,
      maxQuestionsPerRun: 25,
      publishedBrandedSetsPerMonth: 99999,
    },
  },
  enterprise: {
    id: "enterprise",
    priceUsd: null,
    features: {
      aiPoweredGeneration: true,
      advancedModels: true,
      pdfExport: true,
      docxExport: true,
      batchGenerate: true,
      prioritySupport: true,
      apiAccess: true,
    },
    limits: {
      jdsPerMonth: 99999,
      questionsPerMonth: 99999,
      pdfExportsPerMonth: 99999,
      docxExportsPerMonth: 99999,
      historyRetentionDays: 99999,
      maxSeats: 99999,
      maxQuestionsPerRun: 30,
      publishedBrandedSetsPerMonth: 99999,
    },
  },
};

export const HR_SUBSCRIPTION_FEATURE_ORDER: HrFeatureId[] = [
  "aiPoweredGeneration",
  "advancedModels",
  "pdfExport",
  "docxExport",
  "batchGenerate",
  "prioritySupport",
  "apiAccess",
];

export function planMeetsFeature(planId: HrPlanId, featureId: HrFeatureId): boolean {
  return HR_PLANS[planId].features[featureId] === true;
}

export function getPlanLimits(planId: HrPlanId) {
  return HR_PLANS[planId].limits;
}

/** Maps usage stat ids from settings to per-plan caps */
export function getUsageCaps(planId: HrPlanId): Record<string, number> {
  const L = HR_PLANS[planId].limits;
  return {
    jds: L.jdsPerMonth,
    questions: L.questionsPerMonth,
    exports: L.pdfExportsPerMonth + L.docxExportsPerMonth,
  };
}

export function isHrPlanId(v: string | null): v is HrPlanId {
  return v === "basic" || v === "professional" || v === "business" || v === "enterprise";
}

/** Accepts current or legacy storage values */
export function normalizeStoredHrPlanId(raw: string | null): HrPlanId | null {
  if (!raw) return null;
  if (isHrPlanId(raw)) return raw;
  const mapped = LEGACY_HR_PLAN_IDS[raw];
  return mapped ?? null;
}

export const DEFAULT_HR_PLAN_ID: HrPlanId = "professional";

/** True when mock usage meets or exceeds plan caps (prompts upgrade / blocks generate). */
export function isOverPlanUsageQuota(planId: HrPlanId): boolean {
  const caps = getUsageCaps(planId);
  return usageStats.some((row) => {
    const cap = caps[row.id];
    if (cap === undefined || cap <= 0) return false;
    return row.current >= cap;
  });
}
