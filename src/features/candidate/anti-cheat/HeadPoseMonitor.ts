import {
  DEBUG_ANTI_CHEAT,
  FACE_CHECK_INTERVAL_MS,
  LOOK_AWAY_YAW_THRESHOLD,
  LOOKING_AWAY_MIN_DURATION_MS,
} from "./constants";
import type { EventTracker } from "./EventTracker";
import type { FaceMonitor } from "./FaceMonitor";

/**
 * Head Direction / Looking Away — NOT precise eye tracking.
 * Emits once when looking away past threshold while still looking away.
 */
export class HeadPoseMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private faceMonitor: FaceMonitor | null = null;
  private tracker: EventTracker | null = null;
  private active = false;
  private lookingAwaySince: number | null = null;
  private lookingAwayEmitted = false;
  private lastDirection: "center" | "left" | "right" | "unknown" = "unknown";

  getHeadDirection(): "center" | "left" | "right" | "unknown" {
    return this.lastDirection;
  }

  start(faceMonitor: FaceMonitor, tracker: EventTracker): void {
    this.faceMonitor = faceMonitor;
    this.tracker = tracker;
    this.active = true;
    this.lookingAwaySince = null;
    this.lookingAwayEmitted = false;
    this.stopInterval();
    this.intervalId = setInterval(() => this.tick(), FACE_CHECK_INTERVAL_MS);
  }

  stop(): void {
    this.active = false;
    this.finalizeOpen();
    this.stopInterval();
    this.faceMonitor = null;
  }

  destroy(): void {
    this.stop();
  }

  private stopInterval(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private emitLookingAway(now: number): void {
    if (!this.tracker || this.lookingAwaySince == null || this.lookingAwayEmitted) return;
    const dur = now - this.lookingAwaySince;
    if (dur < LOOKING_AWAY_MIN_DURATION_MS) return;
    this.tracker.addFinalizedEvent("LOOKING_AWAY", this.lookingAwaySince, now, {
      metadata: { direction: this.lastDirection },
    });
    this.lookingAwayEmitted = true;
    if (DEBUG_ANTI_CHEAT) {
      console.log(
        `[AntiCheat] LOOKING_AWAY emitted while active: ${(dur / 1000).toFixed(1)} sec`
      );
    }
  }

  private finalizeOpen(): void {
    const now = performance.now();
    this.emitLookingAway(now);
    this.lookingAwaySince = null;
    this.lookingAwayEmitted = false;
  }

  /**
   * Landmark indices (MediaPipe Face Mesh subset used by FaceLandmarker):
   * 1 ≈ nose tip, 33 ≈ left eye outer, 263 ≈ right eye outer
   */
  private estimateLookingAway(
    landmarks: Array<{ x: number; y: number; z: number }>
  ): { lookingAway: boolean; direction: "center" | "left" | "right" } {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    if (!nose || !leftEye || !rightEye) {
      return { lookingAway: false, direction: "center" };
    }

    const midX = (leftEye.x + rightEye.x) / 2;
    const eyeDist = Math.abs(rightEye.x - leftEye.x) || 1e-6;
    const normalized = ((nose.x - midX) / eyeDist) * 100;
    const away = Math.abs(normalized) > LOOK_AWAY_YAW_THRESHOLD;
    const direction = !away ? "center" : normalized > 0 ? "left" : "right";
    return { lookingAway: away, direction };
  }

  private tick(): void {
    if (!this.active || !this.faceMonitor || !this.tracker) return;
    const faces = this.faceMonitor.getLastLandmarks();
    const now = performance.now();

    if (faces.length !== 1) {
      if (this.lookingAwaySince != null) {
        this.emitLookingAway(now);
        this.lookingAwaySince = null;
        this.lookingAwayEmitted = false;
      }
      this.lastDirection = faces.length === 0 ? "unknown" : "center";
      return;
    }

    const { lookingAway, direction } = this.estimateLookingAway(faces[0]);
    this.lastDirection = direction;

    if (lookingAway) {
      if (this.lookingAwaySince == null) {
        this.lookingAwaySince = now;
        this.lookingAwayEmitted = false;
        if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] LOOKING_AWAY started", direction);
      }
      this.emitLookingAway(now);
    } else if (this.lookingAwaySince != null) {
      this.emitLookingAway(now);
      this.lookingAwaySince = null;
      this.lookingAwayEmitted = false;
    }
  }
}
