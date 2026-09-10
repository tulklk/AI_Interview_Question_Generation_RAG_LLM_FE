import {
  FACE_CHECK_INTERVAL_MS,
  FACE_LANDMARKER_MODEL_URL,
  MEDIAPIPE_WASM_ROOT,
  MULTIPLE_FACE_MIN_DURATION_MS,
  NO_FACE_MIN_DURATION_MS,
  DEBUG_ANTI_CHEAT,
} from "./constants";
import type { EventTracker } from "./EventTracker";
import { silenceMediaPipeConsoleNoise } from "./silenceMediaPipeConsole";

type FaceLandmarkerLike = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number
  ) => { faceLandmarks: Array<Array<{ x: number; y: number; z: number }>> };
  close?: () => void;
};

/**
 * Face presence via MediaPipe FaceLandmarker (client-side only).
 * Emits NO_FACE / MULTIPLE_FACE once when min duration is reached while
 * still violating — does not wait for the condition to clear.
 */
export class FaceMonitor {
  private landmarker: FaceLandmarkerLike | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private inferring = false;
  private video: HTMLVideoElement | null = null;
  private tracker: EventTracker | null = null;
  private active = false;

  private noFaceSince: number | null = null;
  private noFaceEmitted = false;
  private multiFaceSince: number | null = null;
  private multiFaceEmitted = false;
  private lastFaceCount = 0;
  private lastLandmarks: Array<Array<{ x: number; y: number; z: number }>> = [];

  async initialize(): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.landmarker) return;

    silenceMediaPipeConsoleNoise();

    const vision = await import("@mediapipe/tasks-vision");
    const { FaceLandmarker, FilesetResolver } = vision;
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);

    try {
      this.landmarker = (await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 3,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      })) as FaceLandmarkerLike;
    } catch {
      this.landmarker = (await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL_URL,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numFaces: 3,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: true,
      })) as FaceLandmarkerLike;
    }

    if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] FaceLandmarker ready");
  }

  getFaceCount(): number {
    return this.lastFaceCount;
  }

  getLastLandmarks(): Array<Array<{ x: number; y: number; z: number }>> {
    return this.lastLandmarks;
  }

  start(video: HTMLVideoElement, tracker: EventTracker): void {
    this.video = video;
    this.tracker = tracker;
    this.active = true;
    this.noFaceSince = null;
    this.noFaceEmitted = false;
    this.multiFaceSince = null;
    this.multiFaceEmitted = false;
    this.stopInterval();
    this.intervalId = setInterval(() => {
      void this.tick();
    }, FACE_CHECK_INTERVAL_MS);
  }

  stop(): void {
    this.active = false;
    this.finalizeOpenEpisodes();
    this.stopInterval();
    this.video = null;
  }

  destroy(): void {
    this.stop();
    try {
      this.landmarker?.close?.();
    } catch {
      /* ignore */
    }
    this.landmarker = null;
  }

  private stopInterval(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private finalizeOpenEpisodes(): void {
    const now = performance.now();
    if (this.noFaceSince != null && this.tracker && !this.noFaceEmitted) {
      const dur = now - this.noFaceSince;
      if (dur >= NO_FACE_MIN_DURATION_MS) {
        this.tracker.addFinalizedEvent("NO_FACE", this.noFaceSince, now);
        this.noFaceEmitted = true;
        if (DEBUG_ANTI_CHEAT) {
          console.log(`[AntiCheat] NO_FACE finalized on stop: ${(dur / 1000).toFixed(1)} sec`);
        }
      }
    }
    this.noFaceSince = null;
    this.noFaceEmitted = false;

    if (this.multiFaceSince != null && this.tracker && !this.multiFaceEmitted) {
      const dur = now - this.multiFaceSince;
      if (dur >= MULTIPLE_FACE_MIN_DURATION_MS) {
        this.tracker.addFinalizedEvent("MULTIPLE_FACE", this.multiFaceSince, now, {
          metadata: { faceCount: this.lastFaceCount },
        });
        this.multiFaceEmitted = true;
        if (DEBUG_ANTI_CHEAT) {
          console.log(`[AntiCheat] MULTIPLE_FACE finalized on stop: ${(dur / 1000).toFixed(1)} sec`);
        }
      }
    }
    this.multiFaceSince = null;
    this.multiFaceEmitted = false;
  }

  private async tick(): Promise<void> {
    if (!this.active || !this.video || !this.landmarker || this.inferring) return;
    const video = this.video;
    if (video.readyState < 2) return;

    this.inferring = true;
    try {
      const ts = performance.now();
      const result = this.landmarker.detectForVideo(video, ts);
      const faces = result.faceLandmarks ?? [];
      this.lastLandmarks = faces;
      this.lastFaceCount = faces.length;
      this.updatePresenceState(faces.length, ts);
    } catch (err) {
      if (DEBUG_ANTI_CHEAT) console.warn("[AntiCheat] face tick error", err);
    } finally {
      this.inferring = false;
    }
  }

  private updatePresenceState(faceCount: number, now: number): void {
    if (!this.tracker) return;

    // NO_FACE — emit once while still no face after threshold
    if (faceCount === 0) {
      if (this.noFaceSince == null) {
        this.noFaceSince = now;
        this.noFaceEmitted = false;
        if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] NO_FACE started");
      } else if (!this.noFaceEmitted && now - this.noFaceSince >= NO_FACE_MIN_DURATION_MS) {
        this.tracker.addFinalizedEvent("NO_FACE", this.noFaceSince, now);
        this.noFaceEmitted = true;
        if (DEBUG_ANTI_CHEAT) {
          console.log(
            `[AntiCheat] NO_FACE emitted while active: ${((now - this.noFaceSince) / 1000).toFixed(1)} sec`
          );
        }
      }
    } else if (this.noFaceSince != null) {
      // Cleared — do not re-emit; episode already counted if emitted
      if (!this.noFaceEmitted && now - this.noFaceSince >= NO_FACE_MIN_DURATION_MS) {
        this.tracker.addFinalizedEvent("NO_FACE", this.noFaceSince, now);
        if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] NO_FACE edge emit on clear");
      }
      this.noFaceSince = null;
      this.noFaceEmitted = false;
    }

    // MULTIPLE_FACE — emit once while still multiple faces after threshold
    if (faceCount >= 2) {
      if (this.multiFaceSince == null) {
        this.multiFaceSince = now;
        this.multiFaceEmitted = false;
        if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] MULTIPLE_FACE started");
      } else if (
        !this.multiFaceEmitted &&
        now - this.multiFaceSince >= MULTIPLE_FACE_MIN_DURATION_MS
      ) {
        this.tracker.addFinalizedEvent("MULTIPLE_FACE", this.multiFaceSince, now, {
          metadata: { faceCount },
        });
        this.multiFaceEmitted = true;
        if (DEBUG_ANTI_CHEAT) {
          console.log(
            `[AntiCheat] MULTIPLE_FACE emitted while active: ${((now - this.multiFaceSince) / 1000).toFixed(1)} sec`
          );
        }
      }
    } else if (this.multiFaceSince != null) {
      if (
        !this.multiFaceEmitted &&
        now - this.multiFaceSince >= MULTIPLE_FACE_MIN_DURATION_MS
      ) {
        this.tracker.addFinalizedEvent("MULTIPLE_FACE", this.multiFaceSince, now, {
          metadata: { faceCount: this.lastFaceCount },
        });
        if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] MULTIPLE_FACE edge emit on clear");
      }
      this.multiFaceSince = null;
      this.multiFaceEmitted = false;
    }
  }
}
