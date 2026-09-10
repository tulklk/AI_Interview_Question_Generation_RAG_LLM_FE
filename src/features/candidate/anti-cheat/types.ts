/**
 * Interview Integrity Monitoring — local browser analysis only.
 * Anti-cheat video analysis runs locally in the candidate's browser.
 * The anti-cheat module does not upload webcam frames.
 */

export type AntiCheatEventType =
  | "NO_FACE"
  | "MULTIPLE_FACE"
  | "PHONE_DETECTED"
  | "LOOKING_AWAY"
  | "TAB_SWITCH"
  | "WINDOW_FOCUS_LOST"
  | "FULLSCREEN_EXIT"
  | "CAMERA_DISABLED";

export interface AntiCheatEvent {
  id: string;
  type: AntiCheatEventType;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface AntiCheatSummary {
  totalEvents: number;
  noFaceEvents: number;
  multipleFaceEvents: number;
  phoneEvents: number;
  lookingAwayEvents: number;
  tabSwitchEvents: number;
  windowFocusLostEvents: number;
  fullscreenExitEvents: number;
  cameraDisabledEvents: number;
  totalNoFaceDurationMs: number;
  totalPhoneDurationMs: number;
  totalLookingAwayDurationMs: number;
  totalTabSwitchDurationMs: number;
  totalWindowFocusLostDurationMs: number;
  facePresencePercentage: number;
  interviewDurationMs: number;
}

export interface AntiCheatPersistedPayload {
  sessionId: string;
  interviewStartTime: number;
  interviewEndTime?: number;
  events: AntiCheatEvent[];
  summary: AntiCheatSummary;
}

export interface AntiCheatDebugSnapshot {
  faceCount: number;
  phoneDetected: boolean;
  phoneConfidence: number | null;
  headDirection: "center" | "left" | "right" | "unknown";
  tabVisible: boolean;
  fullscreen: boolean;
  cameraReady: boolean;
  monitoringActive: boolean;
}

export type AntiCheatSetupItemStatus =
  | "pending"
  | "checking"
  | "ready"
  | "unavailable"
  | "error";

export interface AntiCheatSetupStatus {
  camera: AntiCheatSetupItemStatus;
  face: AntiCheatSetupItemStatus;
  singleCandidate: AntiCheatSetupItemStatus;
  phoneModel: AntiCheatSetupItemStatus;
  integrity: AntiCheatSetupItemStatus;
  errorMessage?: string;
}

export interface AntiCheatSessionContext {
  sessionId: string;
  interviewStartTime: number;
}

export interface IntegrityStrike {
  id: string;
  strikeNumber: number;
  eventType: AntiCheatEventType;
  timestamp: number;
  message: string;
  eventId?: string;
}

export interface IntegrityState {
  sessionId: string;
  strikeCount: number;
  maxStrikes: number;
  terminated: boolean;
  strikes: IntegrityStrike[];
}

export type IntegrityStrikeListener = (state: IntegrityState, latest?: IntegrityStrike) => void;
