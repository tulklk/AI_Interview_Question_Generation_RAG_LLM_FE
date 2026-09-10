import {
  DEBUG_ANTI_CHEAT,
  integrityStateKeyForSession,
  MAX_INTEGRITY_STRIKES,
} from "./constants";
import { integrityEventDescription, integrityEventDisplayName } from "./integrity-labels";
import type {
  AntiCheatEvent,
  AntiCheatEventType,
  IntegrityState,
  IntegrityStrike,
  IntegrityStrikeListener,
} from "./types";

const STRIKE_EVENT_TYPES = new Set<AntiCheatEventType>([
  "NO_FACE",
  "MULTIPLE_FACE",
  "PHONE_DETECTED",
  "LOOKING_AWAY",
  "TAB_SWITCH",
  "WINDOW_FOCUS_LOST",
  "FULLSCREEN_EXIT",
  "CAMERA_DISABLED",
]);

function newStrikeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `strike_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyState(sessionId: string): IntegrityState {
  return {
    sessionId,
    strikeCount: 0,
    maxStrikes: MAX_INTEGRITY_STRIKES,
    terminated: false,
    strikes: [],
  };
}

/**
 * 3-strike integrity layer on top of finalized AntiCheatEvents.
 * One event id → at most one strike. Warning queue is one-at-a-time.
 */
export class IntegrityStrikeManager {
  private state: IntegrityState = emptyState("");
  private processedEventIds = new Set<string>();
  private listeners = new Set<IntegrityStrikeListener>();
  private warningQueue: IntegrityStrike[] = [];
  private activeWarning: IntegrityStrike | null = null;
  private terminateListeners = new Set<(state: IntegrityState) => void>();

  reset(sessionId: string): void {
    this.state = emptyState(sessionId);
    this.processedEventIds.clear();
    this.warningQueue = [];
    this.activeWarning = null;
    this.persist();
    this.emit();
  }

  /** Restore from sessionStorage; returns true if a prior terminated state was found. */
  restore(sessionId: string): IntegrityState {
    const saved = IntegrityStrikeManager.load(sessionId);
    if (saved) {
      this.state = {
        ...saved,
        maxStrikes: MAX_INTEGRITY_STRIKES,
        sessionId,
      };
      this.processedEventIds = new Set(
        saved.strikes.map((s) => s.eventId).filter((id): id is string => Boolean(id))
      );
      this.warningQueue = [];
      this.activeWarning = null;
      this.emit();
      return this.getState();
    }
    this.reset(sessionId);
    return this.getState();
  }

  getState(): IntegrityState {
    return {
      ...this.state,
      strikes: [...this.state.strikes],
    };
  }

  getStrikeCount(): number {
    return this.state.strikeCount;
  }

  getRemainingWarnings(): number {
    if (this.state.terminated) return 0;
    return Math.max(0, MAX_INTEGRITY_STRIKES - 1 - this.state.strikeCount);
  }

  isTerminated(): boolean {
    return this.state.terminated;
  }

  getStrikes(): IntegrityStrike[] {
    return [...this.state.strikes];
  }

  getActiveWarning(): IntegrityStrike | null {
    return this.activeWarning;
  }

  subscribe(listener: IntegrityStrikeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onTerminated(listener: (state: IntegrityState) => void): () => void {
    this.terminateListeners.add(listener);
    return () => this.terminateListeners.delete(listener);
  }

  acknowledgeWarning(): void {
    this.activeWarning = null;
    this.dequeueWarning();
    this.emit();
  }

  registerViolation(event: AntiCheatEvent): IntegrityStrike | null {
    if (!STRIKE_EVENT_TYPES.has(event.type)) return null;
    if (this.processedEventIds.has(event.id)) return null;
    if (this.state.terminated) return null;

    this.processedEventIds.add(event.id);

    const strikeNumber = this.state.strikeCount + 1;
    const strike: IntegrityStrike = {
      id: newStrikeId(),
      strikeNumber,
      eventType: event.type,
      timestamp: Date.now(),
      message: integrityEventDisplayName(event.type),
      eventId: event.id,
    };

    this.state = {
      ...this.state,
      strikeCount: strikeNumber,
      strikes: [...this.state.strikes, strike],
      terminated: strikeNumber >= MAX_INTEGRITY_STRIKES,
    };

    this.persist();

    if (DEBUG_ANTI_CHEAT) {
      console.log(`[Integrity] strike ${strikeNumber}/${MAX_INTEGRITY_STRIKES}`, event.type);
    }

    if (this.state.terminated) {
      this.warningQueue = [];
      this.activeWarning = null;
      this.emit(strike);
      for (const l of this.terminateListeners) {
        try {
          l(this.getState());
        } catch {
          /* ignore */
        }
      }
      return strike;
    }

    // Warning 1 or 2
    this.enqueueWarning(strike);
    this.emit(strike);
    return strike;
  }

  private enqueueWarning(strike: IntegrityStrike): void {
    if (this.activeWarning) {
      this.warningQueue.push(strike);
      return;
    }
    this.activeWarning = strike;
  }

  private dequeueWarning(): void {
    if (this.activeWarning) return;
    const next = this.warningQueue.shift() ?? null;
    this.activeWarning = next;
  }

  private emit(latest?: IntegrityStrike): void {
    const snapshot = this.getState();
    for (const l of this.listeners) {
      try {
        l(snapshot, latest);
      } catch {
        /* ignore */
      }
    }
  }

  private persist(): void {
    if (typeof window === "undefined" || !this.state.sessionId) return;
    try {
      window.sessionStorage.setItem(
        integrityStateKeyForSession(this.state.sessionId),
        JSON.stringify(this.state)
      );
    } catch {
      /* ignore */
    }
  }

  static load(sessionId: string): IntegrityState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(integrityStateKeyForSession(sessionId));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as IntegrityState;
      if (!parsed || parsed.sessionId !== sessionId || !Array.isArray(parsed.strikes)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /** Description helper for UI (avoids duplicating label map in components). */
  static descriptionFor(type: AntiCheatEventType): string {
    return integrityEventDescription(type);
  }
}
