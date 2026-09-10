/** Central thresholds for Interview Integrity Monitoring — tune here only. */

export const NO_FACE_MIN_DURATION_MS = 3000;
export const MULTIPLE_FACE_MIN_DURATION_MS = 2000;
export const PHONE_MIN_DURATION_MS = 2000;
export const LOOKING_AWAY_MIN_DURATION_MS = 4000;

export const FACE_CHECK_INTERVAL_MS = 200;
export const PHONE_CHECK_INTERVAL_MS = 1000;

export const PHONE_CONFIDENCE_THRESHOLD = 0.6;
export const PHONE_DETECTION_GRACE_MS = 1000;

/** Approximate horizontal head-turn threshold (degrees / normalized equiv). */
export const LOOK_AWAY_YAW_THRESHOLD = 30;

/** Analysis canvas size for optional downscale (performance). */
export const ANALYSIS_WIDTH = 640;
export const ANALYSIS_HEIGHT = 360;

export const STORAGE_KEY_PREFIX = "hiregen_anti_cheat_events_";
export const INTEGRITY_STATE_KEY_PREFIX = "hiregen_integrity_state_";

/** 3-strike interview integrity system. */
export const MAX_INTEGRITY_STRIKES = 3;

/** Ignore blur-only focus flickers shorter than this. */
export const FOCUS_LOST_MIN_DURATION_MS = 750;

/** Merge related blur + visibilitychange into one focus-away incident. */
export const FOCUS_AWAY_MERGE_MS = 800;

export const DEBUG_ANTI_CHEAT = process.env.NODE_ENV === "development";

export function storageKeyForSession(sessionId: string): string {
  return `${STORAGE_KEY_PREFIX}${sessionId}`;
}

export function integrityStateKeyForSession(sessionId: string): string {
  return `${INTEGRITY_STATE_KEY_PREFIX}${sessionId}`;
}

/** MediaPipe Face Landmarker model (CDN — downloaded to browser, frames stay local). */
export const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export const MEDIAPIPE_WASM_ROOT =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm";
