import type { GenerationRun } from "@/features/studio/types/studio.types";

export const GENERATION_POLL_DEADLINE_MS = 5 * 60_000;
export const GENERATION_POLL_INTERVAL_MS = 2500;

export type PollGenerationRunResult =
  | { cancelled: true; latest: GenerationRun }
  | { cancelled: false; latest: GenerationRun };

/**
 * Poll a generation run until it reaches a terminal status (Completed/Failed/
 * Cancelled) or the 5-minute deadline elapses.
 *
 * Shared by both the initial question-generation poll (use-studio.ts's
 * generateQuestions) and the per-question regenerate poll (studio-page.tsx) —
 * the deadline/interval/status-check loop used to be duplicated verbatim
 * between the two, so a change to polling behavior had to be made twice.
 */
export async function pollGenerationRun(params: {
  initialRun: GenerationRun;
  getGenerationRun: () => Promise<GenerationRun>;
  isCancelled: () => boolean;
  /** Called after each successful poll tick (e.g. to update UI state as it progresses). */
  onTick?: (run: GenerationRun) => void;
}): Promise<PollGenerationRunResult> {
  const { initialRun, getGenerationRun, isCancelled, onTick } = params;
  const deadline = Date.now() + GENERATION_POLL_DEADLINE_MS;
  let latest = initialRun;
  while (Date.now() < deadline) {
    if (latest.status === "Completed" || latest.status === "Failed" || latest.status === "Cancelled") break;
    if (isCancelled()) return { cancelled: true, latest };
    await new Promise((r) => setTimeout(r, GENERATION_POLL_INTERVAL_MS));
    if (isCancelled()) return { cancelled: true, latest };
    latest = await getGenerationRun();
    onTick?.(latest);
  }
  return { cancelled: false, latest };
}
