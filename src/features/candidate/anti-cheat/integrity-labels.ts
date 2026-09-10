import type { AntiCheatEventType } from "./types";

/** Short labels for status, timeline, and violation history (EN fallback). */
export const INTEGRITY_EVENT_DISPLAY_NAMES: Record<AntiCheatEventType, string> = {
  NO_FACE: "Candidate not visible",
  MULTIPLE_FACE: "Multiple people detected",
  PHONE_DETECTED: "Mobile phone detected",
  LOOKING_AWAY: "Prolonged looking away",
  TAB_SWITCH: "Left interview tab",
  WINDOW_FOCUS_LOST: "Interview window lost focus",
  FULLSCREEN_EXIT: "Exited fullscreen",
  CAMERA_DISABLED: "Camera disabled",
};

/** Longer copy for warning popups (EN fallback). */
export const INTEGRITY_EVENT_DESCRIPTIONS: Record<AntiCheatEventType, string> = {
  NO_FACE: "You were not visible in the camera for an extended period.",
  MULTIPLE_FACE: "More than one person was visible in the camera.",
  PHONE_DETECTED: "A mobile phone was detected in the camera.",
  LOOKING_AWAY: "Prolonged head movement away from the interview was detected.",
  TAB_SWITCH: "You left the active interview tab.",
  WINDOW_FOCUS_LOST: "The interview window lost focus.",
  FULLSCREEN_EXIT: "You exited fullscreen mode during the interview.",
  CAMERA_DISABLED: "The interview camera was disabled or disconnected.",
};

export type IntegrityEventCopy = Partial<
  Record<AntiCheatEventType, { name?: string; description?: string }>
>;

export function integrityEventDisplayName(
  type: AntiCheatEventType,
  copy?: IntegrityEventCopy
): string {
  return copy?.[type]?.name ?? INTEGRITY_EVENT_DISPLAY_NAMES[type] ?? type;
}

export function integrityEventDescription(
  type: AntiCheatEventType,
  copy?: IntegrityEventCopy
): string {
  return (
    copy?.[type]?.description ??
    INTEGRITY_EVENT_DESCRIPTIONS[type] ??
    INTEGRITY_EVENT_DISPLAY_NAMES[type] ??
    type
  );
}
