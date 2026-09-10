/**
 * MediaPipe / TFLite logs benign INFO lines via console.error
 * (e.g. "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.").
 * Next.js Dev Overlay treats console.error as a hard error — filter those only.
 */

const BENIGN_TF_MEDIAPIPE =
  /^(INFO|WARNING):\s/i;

let installed = false;

export function silenceMediaPipeConsoleNoise(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const text = args
      .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : String(a)))
      .join(" ");
    if (
      BENIGN_TF_MEDIAPIPE.test(text.trim()) ||
      text.includes("XNNPACK delegate") ||
      text.includes("TensorFlow Lite")
    ) {
      return;
    }
    originalError(...args);
  };
}
