import {
  DEBUG_ANTI_CHEAT,
  PHONE_CHECK_INTERVAL_MS,
  PHONE_CONFIDENCE_THRESHOLD,
  PHONE_DETECTION_GRACE_MS,
  PHONE_MIN_DURATION_MS,
} from "./constants";
import type { EventTracker } from "./EventTracker";
import { silenceMediaPipeConsoleNoise } from "./silenceMediaPipeConsole";

type CocoPrediction = { class: string; score: number };
type CocoModel = {
  detect: (input: HTMLVideoElement) => Promise<CocoPrediction[]>;
};

/**
 * Phone detection via TensorFlow.js COCO-SSD — runs locally on the existing video element.
 * Emits once when phone is sustained past threshold — does not wait for phone to disappear.
 */
export class PhoneMonitor {
  private model: CocoModel | null = null;
  private loadFailed = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private inferring = false;
  private video: HTMLVideoElement | null = null;
  private tracker: EventTracker | null = null;
  private active = false;

  private phoneVisibleSince: number | null = null;
  private phoneEmitted = false;
  private lastSeenPhoneAt: number | null = null;
  private maxConfidence = 0;
  private sumConfidence = 0;
  private confSamples = 0;
  private lastDetected = false;
  private lastConfidence: number | null = null;

  async initialize(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (this.model) return true;
    if (this.loadFailed) return false;

    try {
      silenceMediaPipeConsoleNoise();
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");
      this.model = (await cocoSsd.load({ base: "lite_mobilenet_v2" })) as CocoModel;
      if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] COCO-SSD ready");
      return true;
    } catch (err) {
      this.loadFailed = true;
      if (DEBUG_ANTI_CHEAT) console.warn("[AntiCheat] COCO-SSD load failed", err);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.model != null && !this.loadFailed;
  }

  getLastDetected(): boolean {
    return this.lastDetected;
  }

  getLastConfidence(): number | null {
    return this.lastConfidence;
  }

  start(video: HTMLVideoElement, tracker: EventTracker): void {
    if (!this.model) return;
    this.video = video;
    this.tracker = tracker;
    this.active = true;
    this.phoneVisibleSince = null;
    this.phoneEmitted = false;
    this.lastSeenPhoneAt = null;
    this.maxConfidence = 0;
    this.sumConfidence = 0;
    this.confSamples = 0;
    this.stopInterval();
    this.intervalId = setInterval(() => {
      void this.tick();
    }, PHONE_CHECK_INTERVAL_MS);
  }

  stop(): void {
    this.active = false;
    this.finalizeOpen();
    this.stopInterval();
    this.video = null;
  }

  destroy(): void {
    this.stop();
    this.model = null;
  }

  private stopInterval(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private emitPhone(now: number): void {
    if (!this.tracker || this.phoneVisibleSince == null || this.phoneEmitted) return;
    const dur = now - this.phoneVisibleSince;
    if (dur < PHONE_MIN_DURATION_MS) return;
    const avg = this.confSamples > 0 ? this.sumConfidence / this.confSamples : this.maxConfidence;
    this.tracker.addFinalizedEvent("PHONE_DETECTED", this.phoneVisibleSince, now, {
      confidence: this.maxConfidence,
      metadata: { maxConfidence: this.maxConfidence, averageConfidence: avg },
    });
    this.phoneEmitted = true;
    if (DEBUG_ANTI_CHEAT) {
      console.log(
        `[AntiCheat] PHONE_DETECTED emitted while active: ${this.maxConfidence.toFixed(2)} (${(dur / 1000).toFixed(1)}s)`
      );
    }
  }

  private finalizeOpen(): void {
    const now = performance.now();
    this.emitPhone(now);
    this.phoneVisibleSince = null;
    this.phoneEmitted = false;
  }

  private clearEpisode(): void {
    this.phoneVisibleSince = null;
    this.phoneEmitted = false;
    this.maxConfidence = 0;
    this.sumConfidence = 0;
    this.confSamples = 0;
    this.lastSeenPhoneAt = null;
  }

  private async tick(): Promise<void> {
    if (!this.active || !this.video || !this.model || this.inferring) return;
    if (this.video.readyState < 2) return;

    this.inferring = true;
    const now = performance.now();
    try {
      const preds = await this.model.detect(this.video);
      const phones = preds.filter(
        (p) => p.class === "cell phone" && p.score >= PHONE_CONFIDENCE_THRESHOLD
      );
      const best = phones.reduce<CocoPrediction | null>(
        (acc, p) => (!acc || p.score > acc.score ? p : acc),
        null
      );

      if (best) {
        this.lastDetected = true;
        this.lastConfidence = best.score;
        this.lastSeenPhoneAt = now;
        this.maxConfidence = Math.max(this.maxConfidence, best.score);
        this.sumConfidence += best.score;
        this.confSamples += 1;
        if (this.phoneVisibleSince == null) {
          this.phoneVisibleSince = now;
          this.phoneEmitted = false;
          if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] PHONE_DETECTED started", best.score);
        }
        // Emit while phone still visible after threshold
        this.emitPhone(now);
      } else {
        this.lastDetected = false;
        this.lastConfidence = null;
        if (
          this.phoneVisibleSince != null &&
          this.lastSeenPhoneAt != null &&
          now - this.lastSeenPhoneAt >= PHONE_DETECTION_GRACE_MS
        ) {
          // Edge fallback if threshold met but never emitted mid-episode
          this.emitPhone(now);
          this.clearEpisode();
        }
      }
    } catch (err) {
      if (DEBUG_ANTI_CHEAT) console.warn("[AntiCheat] phone tick error", err);
    } finally {
      this.inferring = false;
    }
  }
}
