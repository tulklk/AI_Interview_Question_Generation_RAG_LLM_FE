import type { StudioFocusAreaItem } from "@/features/studio/types/studio.types";
import {
  normalizeFocusWeight,
  redistributeFocusWeightsTo100,
} from "@/features/studio/utils/distribution-math";

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

/** Bỏ dấu cách/gạch, giữ # + . để "C#" và "ASP.NET Core" không dính nhau. */
export function compactSkillKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9#+.]/g, "");
}

export interface TechSkillCatalogItem {
  name: string;
  label: string;
  group: string;
  aliases: string[];
}

/**
 * Map text JD/RAG về nhãn TechSkill. Khớp compact của label, tên enum hoặc alias.
 * "C# – OOP" lấy phần trước gạch dài.
 */
export function matchTechSkill(name: string, catalog: TechSkillCatalogItem[]): string | null {
  const raw = name.trim();
  if (!raw || catalog.length === 0) return null;
  const head = raw.split(/\s*[—–]\s*|\s+-\s+/)[0]?.trim() || raw;
  const keys = new Set([compactSkillKey(raw), compactSkillKey(head)].filter(Boolean));
  for (const item of catalog) {
    const forms = [item.label, item.name, ...(item.aliases ?? [])];
    if (forms.some((form) => keys.has(compactSkillKey(form)))) return item.label;
  }
  return null;
}

/** Skill JD map được sang enum và chưa có trong focus — dùng cho tag gợi ý. */
export function suggestJdTechSkills(
  jdSkills: string[],
  catalog: TechSkillCatalogItem[],
  usedLabels: string[]
): string[] {
  const used = new Set(usedLabels.map((name) => compactSkillKey(name)));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of jdSkills) {
    const label = matchTechSkill(skill, catalog);
    if (!label) continue;
    const key = compactSkillKey(label);
    if (!key || used.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
  }
  return result;
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
 * Snap tên về catalog, gộp trùng, scale 100%.
 * Không seed cả catalog khi list đã có hoặc khi không match — tag gợi ý JD làm việc đó.
 */
export function normalizeFocusAreasToTechSkills(
  areas: Array<Pick<StudioFocusAreaItem, "name" | "weight" | "orderIndex"> & Partial<StudioFocusAreaItem>>,
  catalog: TechSkillCatalogItem[]
): StudioFocusAreaItem[] {
  if (catalog.length === 0) {
    return prepareFocusAreasForApply(
      areas
        .filter((a) => a.name?.trim())
        .map((a, i) => ({
          name: a.name.trim(),
          weight: normalizeFocusWeight(a.weight),
          orderIndex: a.orderIndex ?? i,
          description: a.description ?? null,
          sourceReason: a.sourceReason ?? null,
        }))
    );
  }

  const merged = new Map<string, StudioFocusAreaItem>();
  for (const area of areas) {
    const matched = matchTechSkill(area.name ?? "", catalog);
    if (!matched) continue;
    const key = compactSkillKey(matched);
    const weight = normalizeFocusWeight(area.weight);
    const existing = merged.get(key);
    if (existing) {
      existing.weight = normalizeFocusWeight(existing.weight + weight);
      if (!existing.sourceReason && area.sourceReason) existing.sourceReason = area.sourceReason;
      continue;
    }
    merged.set(key, {
      name: matched,
      weight,
      orderIndex: merged.size,
      description: area.description ?? null,
      sourceReason: area.sourceReason ?? null,
    });
  }

  const result = [...merged.values()];
  if (result.length === 0) return [];
  return redistributeFocusWeightsTo100(result);
}

/**
 * Snap + merge weight cùng skill + bỏ không match. Không tự seed cả JD.
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

  const result = [...merged.values()];
  if (result.length === 0) return [];
  return redistributeFocusWeightsTo100(result);
}

/**
 * Dedupe theo tên (case-insensitive): cộng weight các dòng trùng,
 * giữ sourceReason/description dòng đầu còn thiếu, rồi scale 100%.
 * Dùng khi load settings/draft và trước apply — tránh list bị nhân đôi sau tạo plan.
 */
export function prepareFocusAreasForApply(
  areas: StudioFocusAreaItem[] | undefined
): StudioFocusAreaItem[] {
  const list = areas ?? [];
  const merged = new Map<string, StudioFocusAreaItem>();
  for (const a of list) {
    const name = (a.name ?? "").trim();
    const k = normKey(name);
    if (!k) continue;
    const weight = normalizeFocusWeight(a.weight);
    const existing = merged.get(k);
    if (existing) {
      existing.weight = normalizeFocusWeight(existing.weight + weight);
      if (!existing.sourceReason && a.sourceReason) existing.sourceReason = a.sourceReason;
      if (!existing.description && a.description) existing.description = a.description;
      continue;
    }
    merged.set(k, {
      ...a,
      name,
      weight,
      orderIndex: merged.size,
    });
  }
  return redistributeFocusWeightsTo100([...merged.values()]);
}
