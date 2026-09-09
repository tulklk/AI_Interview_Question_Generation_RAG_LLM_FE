import {
  ANCHOR_KEYS,
  DEFAULT_SCALE,
  RUBRIC_VERSION,
  type RubricAnchorKey,
  type RubricCriterion,
  type RubricV1,
} from "./types";

function slugify(text: string, fallback = "criterion"): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
  return (slug || fallback).slice(0, 40);
}

function defaultAnchors(label: string): Partial<Record<RubricAnchorKey, string>> {
  return {
    "25": `Chưa đạt — thiếu hoặc sai về ${label}`,
    "50": `Cơ bản — nêu được ý chính về ${label}`,
    "75": `Khá — giải thích rõ và có ví dụ về ${label}`,
    "100": `Xuất sắc — sâu, chính xác, có edge case liên quan ${label}`,
  };
}

function distributeWeights(criteria: RubricCriterion[]): RubricCriterion[] {
  if (criteria.length === 0) return criteria;
  const sum = criteria.reduce((a, c) => a + c.weight, 0);
  if (sum === 100 && criteria.every((c) => c.weight > 0)) return criteria;
  const base = Math.floor(100 / criteria.length);
  let remainder = 100 - base * criteria.length;
  return criteria.map((c, i) => ({
    ...c,
    weight: base + (i < remainder ? 1 : 0),
  }));
}

function parseCriterionObject(raw: Record<string, unknown>, index: number): RubricCriterion | null {
  const label =
    (typeof raw.label === "string" && raw.label.trim()) ||
    (typeof raw.text === "string" && raw.text.trim()) ||
    (typeof raw.criterion === "string" && raw.criterion.trim()) ||
    (typeof raw.name === "string" && raw.name.trim()) ||
    "";
  if (!label) return null;

  const id =
    (typeof raw.id === "string" && raw.id.trim()) || slugify(label, `criterion-${index + 1}`);
  const weight = typeof raw.weight === "number" ? raw.weight : Number(raw.weight) || 0;

  const anchors: Partial<Record<RubricAnchorKey, string>> = {};
  if (raw.anchors && typeof raw.anchors === "object" && !Array.isArray(raw.anchors)) {
    for (const key of ANCHOR_KEYS) {
      const v = (raw.anchors as Record<string, unknown>)[key];
      if (typeof v === "string" && v.trim()) anchors[key] = v.trim();
    }
  }

  return {
    id,
    label: label.trim(),
    weight,
    anchors: Object.keys(anchors).length > 0 ? anchors : defaultAnchors(label.trim()),
  };
}

export function emptyRubric(level?: string | null): RubricV1 {
  return { version: RUBRIC_VERSION, scale: DEFAULT_SCALE, level: level ?? null, criteria: [] };
}

/** Parse RubricV1 JSON string từ BE. */
export function normalizeFromJson(json?: string | null, level?: string | null): RubricV1 {
  if (!json?.trim()) return emptyRubric(level);
  try {
    const parsed = JSON.parse(json) as unknown;
    return normalizeFromUnknown(parsed, level);
  } catch {
    return emptyRubric(level);
  }
}

export function normalizeFromUnknown(raw: unknown, level?: string | null): RubricV1 {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.criteria)) {
      const criteria = obj.criteria
        .map((item, i) =>
          typeof item === "string"
            ? parseCriterionObject({ label: item }, i)
            : item && typeof item === "object"
              ? parseCriterionObject(item as Record<string, unknown>, i)
              : null
        )
        .filter(Boolean) as RubricCriterion[];
      return {
        version: typeof obj.version === "number" ? obj.version : RUBRIC_VERSION,
        scale: typeof obj.scale === "string" ? obj.scale : DEFAULT_SCALE,
        level: (typeof obj.level === "string" ? obj.level : level) ?? null,
        criteria: distributeWeights(criteria),
      };
    }
  }

  if (Array.isArray(raw)) {
    const criteria = raw
      .map((item, i) =>
        typeof item === "string"
          ? parseCriterionObject({ label: item }, i)
          : item && typeof item === "object"
            ? parseCriterionObject(item as Record<string, unknown>, i)
            : null
      )
      .filter(Boolean) as RubricCriterion[];
    return {
      version: RUBRIC_VERSION,
      scale: DEFAULT_SCALE,
      level: level ?? null,
      criteria: distributeWeights(criteria),
    };
  }

  if (typeof raw === "string" && raw.trim()) {
    // Reverse of toDisplayText()'s "[NN%] Label" format — parse weight back out
    // instead of treating the bracketed prefix as part of the label (which would
    // silently corrupt the rubric on every save/reload round-trip).
    const BRACKET_WEIGHT_RE = /^\[(\d+(?:\.\d+)?)%\]\s*(.+)$/;
    const lines = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const items = lines.map((line) => {
      const m = line.match(BRACKET_WEIGHT_RE);
      return m ? { label: m[2].trim(), weight: Number(m[1]) } : line;
    });
    return normalizeFromUnknown(items, level);
  }

  return emptyRubric(level);
}

export function serializeRubric(doc: RubricV1): string {
  return JSON.stringify(doc);
}

export function toDisplayText(doc: RubricV1): string {
  return doc.criteria.map((c) => `[${c.weight}%] ${c.label}`).join("\n");
}

export function rubricToApiPayload(doc: RubricV1): RubricV1 {
  return {
    ...doc,
    criteria: distributeWeights(doc.criteria.filter((c) => c.label.trim())),
  };
}
