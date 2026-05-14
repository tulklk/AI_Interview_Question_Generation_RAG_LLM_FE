export type HrPlanId = "basic" | "professional" | "business" | "enterprise";

export type HrFeatureId =
  | "aiPoweredGeneration"
  | "advancedModels"
  | "pdfExport"
  | "docxExport"
  | "batchGenerate"
  | "prioritySupport"
  | "apiAccess";

export interface HrPlanLimits {
  /** AI-powered JD → question generations per month */
  jdsPerMonth: number;
  questionsPerMonth: number;
  pdfExportsPerMonth: number;
  docxExportsPerMonth: number;
  historyRetentionDays: number;
  maxSeats: number;
  /** Max total questions per generation (batch) */
  maxQuestionsPerRun: number;
  /** Company-branded published sets per month (0 = none) */
  publishedBrandedSetsPerMonth: number;
}

export interface HrPlanDefinition {
  id: HrPlanId;
  /** Monthly USD price; `null` means custom / contact sales */
  priceUsd: number | null;
  /** Highlight card as recommended tier */
  recommended?: boolean;
  features: Record<HrFeatureId, boolean>;
  limits: HrPlanLimits;
}
