import type { StudioFocusAreaItem } from "@/features/studio/types/studio.types";
import {
  normalizeFocusWeight,
  redistributeFocusWeightsTo100,
} from "@/features/studio/utils/distribution-math";

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * SCRUM-433: Map tên focus RAG (vd "C# – OOP") về skill JD catalog.
 * Ưu tiên exact → phần trước —/- → contains (skill dài nhất).
 */
export function matchJdSkill(name: string, jdSkills: string[]): string | null {
  const raw = name.trim();
  if (!raw || jdSkills.length === 0) return null;

  const lower = normKey(raw);
  const exact = jdSkills.find((s) => normKey(s) === lower);
  if (exact) return exact;

  const head = raw.split(/\s*[—–\-]\s*/)[0]?.trim() ?? "";
  if (head) {
    const headLower = normKey(head);
    const byHead = jdSkills.find((s) => normKey(s) === headLower);
    if (byHead) return byHead;
  }

  const sorted = [...jdSkills].sort((a, b) => b.length - a.length);
  for (const skill of sorted) {
    const sk = normKey(skill);
    if (sk.length >= 2 && lower.includes(sk)) return skill;
  }
  return null;
}

export function hasDuplicateFocusNames(areas: StudioFocusAreaItem[] | undefined): boolean {
  const seen = new Set<string>();
  for (const a of areas ?? []) {
    const k = normKey(a.name);
    if (!k) continue;
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

/**
 * Snap + merge weight cùng skill + bỏ không match; rỗng → seed từ JD; scale 100%.
 * SCRUM-434: seed dùng toàn bộ catalog (không còn MAX_SEEDED_FOCUS = 8).
 */
export function normalizeFocusAreasToJdSkills(
  areas: Array<Pick<StudioFocusAreaItem, "name" | "weight" | "orderIndex"> & Partial<StudioFocusAreaItem>>,
  jdSkills: string[]
): StudioFocusAreaItem[] {
  const catalog = jdSkills.map((s) => s.trim()).filter(Boolean);
  if (catalog.length === 0) {
    // Không có catalog — giữ areas (fallback free-text), chỉ scale nếu có
    const kept = areas
      .filter((a) => a.name?.trim())
      .map((a, i) => ({
        name: a.name.trim(),
        weight: normalizeFocusWeight(a.weight),
        orderIndex: a.orderIndex ?? i,
        description: a.description ?? null,
        sourceReason: a.sourceReason ?? null,
      }));
    return redistributeFocusWeightsTo100(kept);
  }

  const merged = new Map<string, StudioFocusAreaItem>();
  for (const a of areas) {
    const matched = matchJdSkill(a.name ?? "", catalog);
    if (!matched) continue;
    const key = normKey(matched);
    const weight = normalizeFocusWeight(a.weight);
    const existing = merged.get(key);
    if (existing) {
      existing.weight = normalizeFocusWeight(existing.weight + weight);
      if (!existing.sourceReason && a.sourceReason) {
        existing.sourceReason = a.sourceReason;
      }
    } else {
      merged.set(key, {
        name: matched,
        weight,
        orderIndex: merged.size,
        description: a.description ?? null,
        sourceReason: a.sourceReason ?? null,
      });
    }
  }

  let result = [...merged.values()];
  if (result.length === 0) {
    // SCRUM-434: seed đủ mọi skill JD
    result = catalog.map((name, i) => ({
      name,
      weight: 0,
      orderIndex: i,
      description: null,
      sourceReason: null,
    }));
  }

  return redistributeFocusWeightsTo100(result);
}

/** Dedupe theo tên (giữ row đầu) rồi scale 100% — dùng trước apply. */
export function prepareFocusAreasForApply(
  areas: StudioFocusAreaItem[] | undefined
): StudioFocusAreaItem[] {
  const list = areas ?? [];
  const seen = new Set<string>();
  const deduped: StudioFocusAreaItem[] = [];
  for (const a of list) {
    const k = normKey(a.name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    deduped.push({ ...a, name: a.name.trim() });
  }
  return redistributeFocusWeightsTo100(deduped);
}
