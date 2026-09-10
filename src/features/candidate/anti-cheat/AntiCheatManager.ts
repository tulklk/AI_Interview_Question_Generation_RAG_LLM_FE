/**
 * Anti-cheat video analysis runs locally in the candidate's browser.
 * The anti-cheat module does not upload webcam frames.
 */

import { DEBUG_ANTI_CHEAT } from "./constants";
import { BrowserMonitor } from "./BrowserMonitor";
import { EventTracker } from "./EventTracker";
import { FaceMonitor } from "./FaceMonitor";
import { HeadPoseMonitor } from "./HeadPoseMonitor";
import { IntegrityStrikeManager } from "./IntegrityStrikeManager";
import { PhoneMonitor } from "./PhoneMonitor";
import type {
  AntiCheatDebugSnapshot,
  AntiCheatEvent,
  AntiCheatEventType,
  AntiCheatSessionContext,
  AntiCheatSetupStatus,
  AntiCheatSummary,
  IntegrityState,
} from "./types";

export class AntiCheatManager {
  private tracker = new EventTracker();
  private face = new FaceMonitor();
  private head = new HeadPoseMonitor();
  private phone = new PhoneMonitor();
  private browser = new BrowserMonitor();
  private strikes = new IntegrityStrikeManager();

  private initialized = false;
  private monitoring = false;
  private phoneAvailable = false;
  private sessionId: string | null = null;

  getStrikeManager(): IntegrityStrikeManager {
    return this.strikes;
  }

  async initialize(): Promise<{ phoneAvailable: boolean }> {
    if (typeof window === "undefined") {
      return { phoneAvailable: false };
    }
    if (this.initialized) {
      return { phoneAvailable: this.phoneAvailable };
    }

    await this.face.initialize();
    this.phoneAvailable = await this.phone.initialize();
    this.initialized = true;
    if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] initialized", { phone: this.phoneAvailable });
    return { phoneAvailable: this.phoneAvailable };
  }

  isPhoneAvailable(): boolean {
    return this.phoneAvailable;
  }

  isMonitoring(): boolean {
    return this.monitoring;
  }

  /**
   * Probe face once for setup checklist (video must be playing).
   */
  async probeFace(video: HTMLVideoElement): Promise<{ faceCount: number }> {
    if (!this.initialized) await this.initialize();
    const tempTracker = new EventTracker();
    tempTracker.clear("__setup__", performance.now());
    this.face.start(video, tempTracker);
    await new Promise((r) => setTimeout(r, 450));
    const faceCount = this.face.getFaceCount();
    this.face.stop();
    return { faceCount };
  }

  /**
   * Restore integrity strikes for a session (e.g. after refresh).
   * Does not start monitors.
   */
  restoreIntegrity(sessionId: string): IntegrityState {
    return this.strikes.restore(sessionId);
  }

  start(video: HTMLVideoElement, ctx: AntiCheatSessionContext): void {
    if (!this.initialized) {
      throw new Error("AntiCheatManager.initialize() required before start()");
    }
    this.sessionId = ctx.sessionId;

    if (this.strikes.isTerminated()) {
      if (DEBUG_ANTI_CHEAT) {
        console.log("[AntiCheat] skip start — session already terminated for integrity");
      }
      return;
    }

    this.tracker.clear(ctx.sessionId, ctx.interviewStartTime);
    this.tracker.setOnFinalized((event) => {
      this.strikes.registerViolation(event);
    });
    this.monitoring = true;

    this.face.start(video, this.tracker);
    this.head.start(this.face, this.tracker);
    if (this.phoneAvailable) {
      this.phone.start(video, this.tracker);
    }
    this.browser.start(video, this.tracker);

    this.installDevTestHelper();

    if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] started", ctx.sessionId);
  }

  stop(): { events: AntiCheatEvent[]; summary: AntiCheatSummary } {
    this.browser.markIntentionalEnd();
    this.face.stop();
    this.head.stop();
    this.phone.stop();
    this.browser.stop();

    this.tracker.setOnFinalized(null);
    this.removeDevTestHelper();

    const end = performance.now();
    this.tracker.setInterviewEndTime(end);
    const summary = this.tracker.calculateSummary(end);
    this.tracker.persist();
    this.monitoring = false;

    if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] stopped", summary);
    return { events: this.tracker.getEvents(), summary };
  }

  getEvents(): AntiCheatEvent[] {
    return this.tracker.getEvents();
  }

  getSummary(): AntiCheatSummary {
    return this.tracker.calculateSummary();
  }

  getDebugSnapshot(): AntiCheatDebugSnapshot {
    return {
      faceCount: this.face.getFaceCount(),
      phoneDetected: this.phone.getLastDetected(),
      phoneConfidence: this.phone.getLastConfidence(),
      headDirection: this.head.getHeadDirection(),
      tabVisible: this.browser.isTabVisible(),
      fullscreen: this.browser.isFullscreen(),
      cameraReady: true,
      monitoringActive: this.monitoring,
    };
  }

  /** Dev-only: synthesize a finalized event for strike testing. */
  triggerTestEvent(type: AntiCheatEventType): AntiCheatEvent | null {
    if (!DEBUG_ANTI_CHEAT || !this.monitoring) return null;
    const now = performance.now();
    return this.tracker.addFinalizedEvent(type, now - 1000, now, {
      metadata: { test: true },
    });
  }

  destroy(): void {
    if (this.monitoring) {
      this.browser.markIntentionalEnd();
      this.face.stop();
      this.head.stop();
      this.phone.stop();
      this.browser.stop();
      this.monitoring = false;
    }
    this.tracker.setOnFinalized(null);
    this.removeDevTestHelper();
    this.face.destroy();
    this.head.destroy();
    this.phone.destroy();
    this.browser.destroy();
    this.initialized = false;
  }

  private installDevTestHelper(): void {
    if (!DEBUG_ANTI_CHEAT || typeof window === "undefined") return;
    window.__hiregenAntiCheatTest = {
      trigger: (type: AntiCheatEventType) => {
        this.triggerTestEvent(type);
      },
      getStrikes: () => this.strikes.getState(),
    };
  }

  private removeDevTestHelper(): void {
    if (typeof window === "undefined") return;
    delete window.__hiregenAntiCheatTest;
  }

  static buildSetupStatus(partial: Partial<AntiCheatSetupStatus>): AntiCheatSetupStatus {
    return {
      camera: partial.camera ?? "pending",
      face: partial.face ?? "pending",
      singleCandidate: partial.singleCandidate ?? "pending",
      phoneModel: partial.phoneModel ?? "pending",
      integrity: partial.integrity ?? "pending",
      errorMessage: partial.errorMessage,
    };
  }
}

export { BrowserMonitor };

declare global {
  interface Window {
    __hiregenAntiCheatTest?: {
      trigger: (type: AntiCheatEventType) => void;
      getStrikes: () => IntegrityState;
    };
  }
}
