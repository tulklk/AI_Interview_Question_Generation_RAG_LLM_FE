import type { RubricV1 } from "./types";

export function isPublishReady(doc: RubricV1 | null | undefined): boolean {
  if (!doc?.criteria?.length) return false;
  const sum = doc.criteria.reduce((a, c) => a + c.weight, 0);
  if (sum !== 100) return false;
  return doc.criteria.every(
    (c) =>
      c.label.trim().length > 0 &&
      c.weight > 0 &&
      Object.keys(c.anchors).length >= 2 &&
      Object.values(c.anchors).some((v) => v?.trim())
  );
}

export function rebalanceWeights(
  criteria: { id: string; weight: number }[],
  changedId: string,
  newWeight: number
): number[] {
  const clamped = Math.max(0, Math.min(100, Math.round(newWeight)));
  const others = criteria.filter((c) => c.id !== changedId);
  if (others.length === 0) return [100];
  const remaining = Math.max(0, 100 - clamped);
  const base = Math.floor(remaining / others.length);
  let rem = remaining - base * others.length;
  return criteria.map((c) => {
    if (c.id === changedId) return clamped;
    const w = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    return w;
  });
}
