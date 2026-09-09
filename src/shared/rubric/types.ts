/** SCRUM-418: RubricV1 — đồng bộ với BE RubricNormalizer */

export type RubricAnchorKey = "25" | "50" | "75" | "100";

export interface RubricCriterion {
  id: string;
  label: string;
  weight: number;
  anchors: Partial<Record<RubricAnchorKey, string>>;
}

export interface RubricV1 {
  version: number;
  scale: string;
  level?: string | null;
  criteria: RubricCriterion[];
}

export const RUBRIC_VERSION = 1;
export const DEFAULT_SCALE = "0-100";
export const ANCHOR_KEYS: RubricAnchorKey[] = ["25", "50", "75", "100"];
