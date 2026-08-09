/**
 * XP sound effects using the Web Audio API.
 * No external files needed — sounds are synthesised directly.
 * All functions are silent-fail safe (blocked autoplay, unsupported browsers, etc.)
 * Respects the user's sound preference stored in localStorage ("hiregen:sound").
 */
import { isSoundEnabled } from "@/features/gamification/hooks/use-sound-preference";

type OscillatorType = "sine" | "triangle" | "square" | "sawtooth";

function createCtx(): AudioContext | null {
  try {
    const Ctor =
      typeof window !== "undefined"
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window.AudioContext ?? (window as any).webkitAudioContext)
        : null;
    return Ctor ? new Ctor() : null;
  } catch {
    return null;
  }
}

function playNote(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  peakGain = 0.28,
  type: OscillatorType = "sine"
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Short ascending chime — played when XP is earned (no level-up). */
export function playXpGainSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = createCtx();
  if (!ctx) return;
  // C5 → E5 → G5
  const notes: [number, number][] = [
    [523.25, 0.00],
    [659.25, 0.13],
    [783.99, 0.26],
  ];
  notes.forEach(([freq, delay]) =>
    playNote(ctx, freq, ctx.currentTime + delay, 0.38, 0.25)
  );
  setTimeout(() => ctx.close().catch(() => {}), 1500);
}

/** Triumphant arpeggio — played on level-up. */
export function playLevelUpSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = createCtx();
  if (!ctx) return;
  // C5 → E5 → G5 → C6 → E6 (bright & ascending)
  const notes: [number, number, number][] = [
    [523.25, 0.00, 0.45],
    [659.25, 0.14, 0.45],
    [783.99, 0.28, 0.55],
    [1046.5, 0.43, 0.65],
    [1318.5, 0.60, 0.80],
  ];
  notes.forEach(([freq, delay, dur]) =>
    playNote(ctx, freq, ctx.currentTime + delay, dur, 0.32)
  );
  setTimeout(() => ctx.close().catch(() => {}), 2500);
}

/** Subtle tick — used for daily-goal completion. */
export function playGoalSound(): void {
  if (!isSoundEnabled()) return;
  const ctx = createCtx();
  if (!ctx) return;
  // E5 → A5 (softer)
  playNote(ctx, 659.25, ctx.currentTime,       0.30, 0.20);
  playNote(ctx, 880.00, ctx.currentTime + 0.15, 0.40, 0.18);
  setTimeout(() => ctx.close().catch(() => {}), 1200);
}
