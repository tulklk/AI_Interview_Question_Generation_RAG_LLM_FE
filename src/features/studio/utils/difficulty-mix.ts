/** Normalize Easy/Medium/Hard keys from BE (camel or Pascal). */
export function normalizeDifficultyMixRaw(
  mix: { easy?: number; medium?: number; hard?: number } | Record<string, unknown> | null | undefined
): { easy: number; medium: number; hard: number } {
  const raw = (mix ?? {}) as Record<string, unknown>;
  const num = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return 0;
  };
  return {
    easy: num("easy", "Easy"),
    medium: num("medium", "Medium"),
    hard: num("hard", "Hard"),
  };
}

export interface DifficultyMixCounts {
  easy: number;
  medium: number;
  hard: number;
}

/**
 * Convert BE difficultyMix (ratios, percentages, counts, or inflated ×100) into
 * integer question counts that sum ≈ totalQuestions.
 */
export function formatDifficultyMixCounts(
  mix: { easy?: number; medium?: number; hard?: number } | Record<string, unknown> | null | undefined,
  totalQuestions: number
): DifficultyMixCounts | null {
  const m = normalizeDifficultyMixRaw(mix);
  const sum = m.easy + m.medium + m.hard;
  const total = Math.max(0, Math.round(totalQuestions) || 0);

  if (sum <= 0 || total <= 0) return null;

  let easy = m.easy;
  let medium = m.medium;
  let hard = m.hard;

  if (sum <= 1.05) {
    // Ratios 0–1
    easy = m.easy * total;
    medium = m.medium * total;
    hard = m.hard * total;
  } else if (Math.abs(sum - 100) <= 8) {
    // Percentages
    easy = (m.easy / 100) * total;
    medium = (m.medium / 100) * total;
    hard = (m.hard / 100) * total;
  } else if (Math.abs(sum - total) <= 2) {
    // Already counts matching total
    easy = m.easy;
    medium = m.medium;
    hard = m.hard;
  } else if (sum > total * 5) {
    // Inflated (e.g. 400/700/400 for a 15-question plan) — rescale
    easy = (m.easy / sum) * total;
    medium = (m.medium / sum) * total;
    hard = (m.hard / sum) * total;
  }

  // Round and rebalance so counts sum to total
  let e = Math.round(easy);
  let med = Math.round(medium);
  let h = Math.round(hard);
  let roundedSum = e + med + h;
  if (roundedSum !== total && roundedSum > 0) {
    const diff = total - roundedSum;
    // Adjust the largest bucket
    const buckets: Array<"e" | "med" | "h"> = [
      e >= med && e >= h ? "e" : med >= h ? "med" : "h",
    ];
    if (buckets[0] === "e") e = Math.max(0, e + diff);
    else if (buckets[0] === "med") med = Math.max(0, med + diff);
    else h = Math.max(0, h + diff);
  }

  return { easy: e, medium: med, hard: h };
}

export function formatDifficultyMixLabel(
  mix: { easy?: number; medium?: number; hard?: number } | Record<string, unknown> | null | undefined,
  totalQuestions: number,
  separator = " · "
): string {
  const counts = formatDifficultyMixCounts(mix, totalQuestions);
  if (!counts) return "—";
  return `${counts.easy}E${separator}${counts.medium}M${separator}${counts.hard}H`;
}
