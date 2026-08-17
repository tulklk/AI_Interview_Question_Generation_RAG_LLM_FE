/**
 * Collapses AI-generated "X – X" duplicate titles down to just "X".
 *
 * The AI Coach sometimes formats question-set titles as "{purpose} – {name}"
 * where both halves turn out identical (e.g. "CV check – CV check"). This
 * helper strips the duplicate so only the first half is displayed.
 *
 * The comparison is case-insensitive so "CV CHECK – cv check" → "CV CHECK".
 * Returns the original string unchanged if no en-dash separator is found or
 * the two halves differ.
 */
export function cleanTitle(title: string): string {
  const sep = " – "; // en-dash with surrounding spaces
  const idx = title.indexOf(sep);
  if (idx === -1) return title;
  const left = title.slice(0, idx).trim();
  const right = title.slice(idx + sep.length).trim();
  return left.toLowerCase() === right.toLowerCase() ? left : title;
}
