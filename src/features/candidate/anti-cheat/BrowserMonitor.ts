import {
  DEBUG_ANTI_CHEAT,
  FOCUS_AWAY_MERGE_MS,
  FOCUS_LOST_MIN_DURATION_MS,
} from "./constants";
import type { EventTracker } from "./EventTracker";
import type { AntiCheatEventType } from "./types";

/**
 * TAB_SWITCH, WINDOW_FOCUS_LOST, FULLSCREEN_EXIT, CAMERA_DISABLED.
 * Visibility + blur/focus are merged into one focus-away incident.
 * Emits while still away (after merge window) — does not wait for return.
 */
export class BrowserMonitor {
  private tracker: EventTracker | null = null;
  private active = false;
  private intentionalEnd = false;
  private video: HTMLVideoElement | null = null;

  private cameraDisabledEmitted = false;
  private trackEndedHandler: (() => void) | null = null;

  /** Merged focus-away episode (tab hide and/or window blur). */
  private awaySince: number | null = null;
  private sawHidden = false;
  private sawBlur = false;
  private awayEmitted = false;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;
  private emitTimer: ReturnType<typeof setTimeout> | null = null;
  private windowHasFocus = true;

  private onVisibility = (): void => {
    if (!this.active || !this.tracker) return;
    if (document.hidden) {
      this.beginAway("hidden");
    } else {
      this.maybeSettleAway();
    }
  };

  private onBlur = (): void => {
    if (!this.active || !this.tracker) return;
    this.windowHasFocus = false;
    this.beginAway("blur");
  };

  private onFocus = (): void => {
    if (!this.active || !this.tracker) return;
    this.windowHasFocus = true;
    this.maybeSettleAway();
  };

  private onFullscreen = (): void => {
    if (!this.active || !this.tracker || this.intentionalEnd) return;
    const el = document.fullscreenElement;
    if (!el) {
      const now = performance.now();
      this.tracker.addFinalizedEvent("FULLSCREEN_EXIT", now, now, {
        metadata: { durationMs: 0 },
      });
      if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] FULLSCREEN_EXIT");
    }
  };

  start(video: HTMLVideoElement, tracker: EventTracker): void {
    this.video = video;
    this.tracker = tracker;
    this.active = true;
    this.intentionalEnd = false;
    this.cameraDisabledEmitted = false;
    this.resetAwayState();
    this.windowHasFocus = typeof document !== "undefined" ? document.hasFocus() : true;

    document.addEventListener("visibilitychange", this.onVisibility);
    document.addEventListener("fullscreenchange", this.onFullscreen);
    window.addEventListener("blur", this.onBlur);
    window.addEventListener("focus", this.onFocus);
    this.attachTrackListener(video);
  }

  /** Call before stop when finishing interview so Esc/exit is not flagged. */
  markIntentionalEnd(): void {
    this.intentionalEnd = true;
  }

  stop(): void {
    this.active = false;
    this.clearSettleTimer();
    this.clearEmitTimer();
    if (!this.intentionalEnd) {
      this.finalizeAwayNow();
    } else {
      this.resetAwayState();
    }
    document.removeEventListener("visibilitychange", this.onVisibility);
    document.removeEventListener("fullscreenchange", this.onFullscreen);
    window.removeEventListener("blur", this.onBlur);
    window.removeEventListener("focus", this.onFocus);
    this.detachTrackListener();
    this.video = null;
  }

  destroy(): void {
    this.stop();
  }

  isTabVisible(): boolean {
    if (typeof document === "undefined") return true;
    return !document.hidden;
  }

  isFullscreen(): boolean {
    if (typeof document === "undefined") return false;
    return Boolean(document.fullscreenElement);
  }

  private beginAway(source: "hidden" | "blur"): void {
    const now = performance.now();
    const isNewEpisode = this.awaySince == null;
    if (isNewEpisode) {
      this.awaySince = now;
      this.awayEmitted = false;
      if (DEBUG_ANTI_CHEAT) console.log(`[AntiCheat] focus-away started (${source})`);
    }
    if (source === "hidden") this.sawHidden = true;
    if (source === "blur") this.sawBlur = true;
    this.clearSettleTimer();

    // Schedule emit while still away (merge blur+hidden into one strike)
    if (!this.awayEmitted) {
      this.scheduleEmitAway();
    }
  }

  private scheduleEmitAway(): void {
    this.clearEmitTimer();
    const delay = this.sawHidden
      ? FOCUS_AWAY_MERGE_MS
      : Math.max(FOCUS_AWAY_MERGE_MS, FOCUS_LOST_MIN_DURATION_MS);
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      this.tryEmitAway();
    }, delay);
  }

  private tryEmitAway(): void {
    if (this.awayEmitted || this.awaySince == null || !this.tracker) return;
    if (!this.isStillAway()) return;

    const now = performance.now();
    const duration = now - this.awaySince;
    const type = this.resolveAwayType(duration);
    if (!type) return;

    this.tracker.addFinalizedEvent(type, this.awaySince, now, {
      metadata: {
        durationMs: duration,
        hidden: this.sawHidden,
        blurred: this.sawBlur,
        emittedWhileAway: true,
      },
    });
    this.awayEmitted = true;
    if (DEBUG_ANTI_CHEAT) {
      console.log(
        `[AntiCheat] ${type} emitted while away: ${(duration / 1000).toFixed(1)}s (hidden=${this.sawHidden}, blur=${this.sawBlur})`
      );
    }
  }

  private isStillAway(): boolean {
    const hidden = typeof document !== "undefined" && document.hidden;
    return hidden || !this.windowHasFocus;
  }

  private maybeSettleAway(): void {
    if (this.awaySince == null) return;
    if (this.isStillAway()) return;

    this.clearSettleTimer();
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      if (this.isStillAway()) return;
      // Already counted while away — just reset. Otherwise fallback emit on short leave.
      if (this.awayEmitted) {
        this.resetAwayState();
        return;
      }
      this.finalizeAwayNow();
    }, FOCUS_AWAY_MERGE_MS);
  }

  private finalizeAwayNow(): void {
    if (this.awaySince == null || !this.tracker) {
      this.resetAwayState();
      return;
    }

    if (this.awayEmitted) {
      this.resetAwayState();
      return;
    }

    const now = performance.now();
    const duration = now - this.awaySince;
    const type = this.resolveAwayType(duration);

    if (type) {
      this.tracker.addFinalizedEvent(type, this.awaySince, now, {
        metadata: {
          durationMs: duration,
          hidden: this.sawHidden,
          blurred: this.sawBlur,
        },
      });
      if (DEBUG_ANTI_CHEAT) {
        console.log(
          `[AntiCheat] ${type} on settle: ${(duration / 1000).toFixed(1)} sec`
        );
      }
    } else if (DEBUG_ANTI_CHEAT) {
      console.log(`[AntiCheat] focus-away ignored (flicker ${Math.round(duration)}ms)`);
    }

    this.resetAwayState();
  }

  private resolveAwayType(durationMs: number): AntiCheatEventType | null {
    if (this.sawHidden) return "TAB_SWITCH";
    if (this.sawBlur && durationMs >= FOCUS_LOST_MIN_DURATION_MS) {
      return "WINDOW_FOCUS_LOST";
    }
    return null;
  }

  private resetAwayState(): void {
    this.awaySince = null;
    this.sawHidden = false;
    this.sawBlur = false;
    this.awayEmitted = false;
    this.clearSettleTimer();
    this.clearEmitTimer();
  }

  private clearSettleTimer(): void {
    if (this.settleTimer != null) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
  }

  private clearEmitTimer(): void {
    if (this.emitTimer != null) {
      clearTimeout(this.emitTimer);
      this.emitTimer = null;
    }
  }

  private attachTrackListener(video: HTMLVideoElement): void {
    this.detachTrackListener();
    const stream = video.srcObject;
    if (!(stream instanceof MediaStream)) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    this.trackEndedHandler = () => {
      if (!this.active || !this.tracker || this.cameraDisabledEmitted) return;
      this.cameraDisabledEmitted = true;
      const now = performance.now();
      this.tracker.addFinalizedEvent("CAMERA_DISABLED", now, now);
      if (DEBUG_ANTI_CHEAT) console.log("[AntiCheat] CAMERA_DISABLED");
    };
    track.addEventListener("ended", this.trackEndedHandler);
  }

  private detachTrackListener(): void {
    if (!this.trackEndedHandler || !this.video) {
      this.trackEndedHandler = null;
      return;
    }
    const stream = this.video.srcObject;
    if (stream instanceof MediaStream) {
      const track = stream.getVideoTracks()[0];
      if (track) track.removeEventListener("ended", this.trackEndedHandler);
    }
    this.trackEndedHandler = null;
  }

  static async requestFullscreenSafe(): Promise<boolean> {
    if (typeof document === "undefined") return false;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      return true;
    } catch {
      return false;
    }
  }

  static async exitFullscreenSafe(): Promise<void> {
    if (typeof document === "undefined") return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  }
}
