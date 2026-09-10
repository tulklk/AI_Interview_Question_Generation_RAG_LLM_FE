import { storageKeyForSession } from "./constants";
import type {
  AntiCheatEvent,
  AntiCheatEventType,
  AntiCheatPersistedPayload,
  AntiCheatSummary,
} from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ac_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptySummary(interviewDurationMs = 0): AntiCheatSummary {
  return {
    totalEvents: 0,
    noFaceEvents: 0,
    multipleFaceEvents: 0,
    phoneEvents: 0,
    lookingAwayEvents: 0,
    tabSwitchEvents: 0,
    windowFocusLostEvents: 0,
    fullscreenExitEvents: 0,
    cameraDisabledEvents: 0,
    totalNoFaceDurationMs: 0,
    totalPhoneDurationMs: 0,
    totalLookingAwayDurationMs: 0,
    totalTabSwitchDurationMs: 0,
    totalWindowFocusLostDurationMs: 0,
    facePresencePercentage: 100,
    interviewDurationMs,
  };
}

export type FinalizedEventListener = (event: AntiCheatEvent) => void;

/**
 * Stores finalized integrity signals only (not per-frame).
 * Persists metadata to sessionStorage — never images or landmarks.
 */
export class EventTracker {
  private events: AntiCheatEvent[] = [];
  private sessionId: string | null = null;
  private interviewStartTime = 0;
  private interviewEndTime: number | undefined;
  private onFinalized: FinalizedEventListener | null = null;

  setOnFinalized(listener: FinalizedEventListener | null): void {
    this.onFinalized = listener;
  }

  clear(sessionId: string, interviewStartTime: number): void {
    this.sessionId = sessionId;
    this.interviewStartTime = interviewStartTime;
    this.interviewEndTime = undefined;
    this.events = [];
    this.persist();
  }

  addFinalizedEvent(
    type: AntiCheatEventType,
    startTime: number,
    endTime: number,
    extras?: { confidence?: number; metadata?: Record<string, unknown> }
  ): AntiCheatEvent | null {
    const durationMs = Math.max(0, endTime - startTime);
    // Deduplicate: same type overlapping / identical window
    const duplicate = this.events.some(
      (e) =>
        e.type === type &&
        e.startTime === startTime &&
        (e.endTime ?? e.startTime) === endTime
    );
    if (duplicate) return null;

    const event: AntiCheatEvent = {
      id: newId(),
      type,
      startTime,
      endTime,
      durationMs,
      confidence: extras?.confidence,
      metadata: extras?.metadata,
    };
    this.events.push(event);
    this.persist();
    try {
      this.onFinalized?.(event);
    } catch {
      /* listener errors must not break monitoring */
    }
    return event;
  }

  getEvents(): AntiCheatEvent[] {
    return [...this.events];
  }

  getInterviewStartTime(): number {
    return this.interviewStartTime;
  }

  setInterviewEndTime(t: number): void {
    this.interviewEndTime = t;
  }

  calculateSummary(interviewEndTime?: number): AntiCheatSummary {
    const end =
      interviewEndTime ??
      this.interviewEndTime ??
      (typeof performance !== "undefined" ? performance.now() : Date.now());
    const start = this.interviewStartTime;
    const interviewDurationMs = Math.max(0, end - start);
    const summary = emptySummary(interviewDurationMs);

    for (const e of this.events) {
      const d = e.durationMs ?? Math.max(0, (e.endTime ?? e.startTime) - e.startTime);
      summary.totalEvents += 1;
      switch (e.type) {
        case "NO_FACE":
          summary.noFaceEvents += 1;
          summary.totalNoFaceDurationMs += d;
          break;
        case "MULTIPLE_FACE":
          summary.multipleFaceEvents += 1;
          break;
        case "PHONE_DETECTED":
          summary.phoneEvents += 1;
          summary.totalPhoneDurationMs += d;
          break;
        case "LOOKING_AWAY":
          summary.lookingAwayEvents += 1;
          summary.totalLookingAwayDurationMs += d;
          break;
        case "TAB_SWITCH":
          summary.tabSwitchEvents += 1;
          summary.totalTabSwitchDurationMs += d;
          break;
        case "WINDOW_FOCUS_LOST":
          summary.windowFocusLostEvents += 1;
          summary.totalWindowFocusLostDurationMs += d;
          break;
        case "FULLSCREEN_EXIT":
          summary.fullscreenExitEvents += 1;
          break;
        case "CAMERA_DISABLED":
          summary.cameraDisabledEvents += 1;
          break;
      }
    }

    const presence =
      interviewDurationMs > 0
        ? 1 - summary.totalNoFaceDurationMs / interviewDurationMs
        : 1;
    summary.facePresencePercentage = Math.max(0, Math.min(100, presence * 100));
    return summary;
  }

  persist(): void {
    if (typeof window === "undefined" || !this.sessionId) return;
    const payload: AntiCheatPersistedPayload = {
      sessionId: this.sessionId,
      interviewStartTime: this.interviewStartTime,
      interviewEndTime: this.interviewEndTime,
      events: this.events,
      summary: this.calculateSummary(this.interviewEndTime),
    };
    try {
      window.sessionStorage.setItem(
        storageKeyForSession(this.sessionId),
        JSON.stringify(payload)
      );
    } catch {
      // quota / private mode — ignore
    }
  }

  static restore(sessionId: string): AntiCheatPersistedPayload | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(storageKeyForSession(sessionId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AntiCheatPersistedPayload;
      if (!parsed || parsed.sessionId !== sessionId || !Array.isArray(parsed.events)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
