import type { QuestionDistributionItem, StudioFocusAreaItem } from "@/features/studio/types/studio.types";

const SUM_TOLERANCE = 0.5;

export function normalizeFocusWeight(weight: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return 0;
  const pct = weight <= 1 ? weight * 100 : weight;
  return Math.min(100, Math.max(0, Math.round(pct * 100) / 100));
}

export function largestRemainderPercentages(counts: number[]): number[] {
  const total = counts.reduce((s, c) => s + Math.max(0, c), 0);
  if (total <= 0) return counts.map(() => 0);
  const raw = counts.map((c) => (Math.max(0, c) / total) * 100);
  const floors = raw.map((p) => Math.floor(p));
  const remainder = 100 - floors.reduce((s, f) => s + f, 0);
  const fractions = raw
    .map((p, i) => ({ i, frac: p - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let r = 0; r < remainder; r++) {
    result[fractions[r % fractions.length].i] += 1;
  }
  return result;
}

export function recountFromPercentages(total: number, percentages: number[]): number[] {
  const safeTotal = Math.max(0, Math.round(total));
  if (safeTotal === 0 || percentages.length === 0) return percentages.map(() => 0);
  const sumPct = percentages.reduce((s, p) => s + Math.max(0, p), 0);
  if (sumPct <= 0) {
    const even = Math.floor(safeTotal / percentages.length);
    const counts = percentages.map(() => even);
    const left = safeTotal - counts.reduce((s, c) => s + c, 0);
    for (let i = 0; i < left; i++) counts[i % counts.length] += 1;
    return counts;
  }
  const raw = percentages.map((p) => (Math.max(0, p) / sumPct) * safeTotal);
  const floors = raw.map((c) => Math.floor(c));
  const remainder = safeTotal - floors.reduce((s, f) => s + f, 0);
  const fractions = raw
    .map((c, i) => ({ i, frac: c - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let r = 0; r < remainder; r++) {
    result[fractions[r % fractions.length].i] += 1;
  }
  return result;
}

export function sumFocusWeights(focusAreas: StudioFocusAreaItem[] | undefined): number {
  return (focusAreas ?? []).reduce((s, fa) => s + normalizeFocusWeight(fa.weight), 0);
}

/**
 * Chia đều 100% cho n skill (dùng khi thêm skill mới).
 * Phần dư (+1) gán từ đầu → skill cuối bằng hoặc ít hơn các skill phía trên.
 * Ví dụ n=3 → 34, 33, 33; n=6 → 17,17,17,17,16,16.
 */
export function equalSplitFocusWeightsTo100(
  areas: StudioFocusAreaItem[]
): StudioFocusAreaItem[] {
  if (areas.length === 0) return [];
  if (areas.length === 1) {
    return [{ ...areas[0], weight: 100, orderIndex: 0 }];
  }
  const n = areas.length;
  const base = Math.floor(100 / n);
  const rem = 100 % n;
  return areas.map((a, i) => ({
    ...a,
    weight: base + (i < rem ? 1 : 0),
    orderIndex: i,
  }));
}

/** Chia lại trọng số focus tổng đúng 100% theo tỷ lệ cũ (xóa area / normalize). */
export function redistributeFocusWeightsTo100(
  areas: StudioFocusAreaItem[]
): StudioFocusAreaItem[] {
  if (areas.length === 0) return [];
  if (areas.length === 1) {
    return [{ ...areas[0], weight: 100, orderIndex: 0 }];
  }
  const weights = areas.map((a) => Math.max(0, normalizeFocusWeight(a.weight)));
  const sum = weights.reduce((s, w) => s + w, 0);
  // Tất cả 0 → chia đều; có trọng số cũ → giữ tỷ lệ rồi scale về 100
  const base = sum > 0 ? weights : areas.map(() => 1);
  const pcts = largestRemainderPercentages(base);
  return areas.map((a, i) => ({
    ...a,
    weight: pcts[i] ?? 0,
    orderIndex: i,
  }));
}

export function validateFocusWeightSum(focusAreas: StudioFocusAreaItem[] | undefined): {
  valid: boolean;
  sum: number;
} {
  const sum = Math.round(sumFocusWeights(focusAreas) * 100) / 100;
  const valid = focusAreas?.length ? Math.abs(sum - 100) <= SUM_TOLERANCE : true;
  return { valid, sum };
}

export function validateDistributionSum(
  distribution: QuestionDistributionItem[] | undefined,
  numberOfQuestions: number
): { valid: boolean; countSum: number; pctSum: number } {
  const items = distribution ?? [];
  const countSum = items.reduce((s, d) => s + (d.questionCount ?? 0), 0);
  const pctSum = items.reduce((s, d) => s + (d.percentage ?? 0), 0);
  const total = Math.round(numberOfQuestions);
  const valid =
    items.length === 0 ||
    (Math.abs(countSum - total) <= 1 && Math.abs(pctSum - 100) <= SUM_TOLERANCE);
  return { valid, countSum, pctSum };
}

export function syncDistributionCounts(
  distribution: QuestionDistributionItem[],
  numberOfQuestions: number
): QuestionDistributionItem[] {
  if (distribution.length === 0) return distribution;
  const pcts = distribution.map((d) => d.percentage ?? 0);
  const counts = recountFromPercentages(numberOfQuestions, pcts);
  return distribution.map((d, i) => ({
    ...d,
    questionCount: counts[i],
    percentage: pcts[i],
  }));
}

export function syncDistributionPercentages(
  distribution: QuestionDistributionItem[]
): QuestionDistributionItem[] {
  const counts = distribution.map((d) => d.questionCount ?? 0);
  const pcts = largestRemainderPercentages(counts);
  return distribution.map((d, i) => ({
    ...d,
    percentage: pcts[i],
    questionCount: counts[i],
  }));
}

/**
 * SCRUM-423: Khi đổi 1 category %, giữ giá trị đó và phân bổ lại phần còn lại
 * cho các category khác sao cho tổng = 100 (tránh warning 106%).
 */
export function redistributePercentages(
  percentages: number[],
  index: number,
  nextPct: number
): number[] {
  const n = percentages.length;
  if (n === 0) return [];
  const clamped = Math.min(100, Math.max(0, Math.round(nextPct)));
  if (n === 1) return [clamped];

  const result = percentages.map((p, i) => (i === index ? clamped : Math.max(0, Math.round(p))));
  const othersIdx = result.map((_, i) => i).filter((i) => i !== index);
  const remain = Math.max(0, 100 - clamped);
  const othersSum = othersIdx.reduce((s, i) => s + result[i], 0);

  if (othersSum <= 0) {
    const even = Math.floor(remain / othersIdx.length);
    let left = remain - even * othersIdx.length;
    for (const i of othersIdx) {
      result[i] = even + (left > 0 ? 1 : 0);
      if (left > 0) left -= 1;
    }
    return result;
  }

  const raw = othersIdx.map((i) => (result[i] / othersSum) * remain);
  const floors = raw.map((p) => Math.floor(p));
  let leftover = remain - floors.reduce((s, f) => s + f, 0);
  const fractions = raw
    .map((p, j) => ({ j, frac: p - floors[j] }))
    .sort((a, b) => b.frac - a.frac);
  for (let r = 0; r < leftover; r++) {
    floors[fractions[r % fractions.length].j] += 1;
  }
  othersIdx.forEach((i, j) => {
    result[i] = floors[j];
  });
  return result;
}
