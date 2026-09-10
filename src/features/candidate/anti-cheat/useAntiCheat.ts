"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AntiCheatManager, BrowserMonitor } from "./AntiCheatManager";
import { DEBUG_ANTI_CHEAT, MAX_INTEGRITY_STRIKES } from "./constants";
import { EventTracker } from "./EventTracker";
import { IntegrityStrikeManager } from "./IntegrityStrikeManager";
import type {
  AntiCheatDebugSnapshot,
  AntiCheatSetupStatus,
  AntiCheatSummary,
  IntegrityState,
  IntegrityStrike,
} from "./types";

const EMPTY_INTEGRITY: IntegrityState = {
  sessionId: "",
  strikeCount: 0,
  maxStrikes: MAX_INTEGRITY_STRIKES,
  terminated: false,
  strikes: [],
};

/**
 * React bridge — keeps high-frequency detection off React state.
 * Exposes setup / monitoring / integrity strikes for UI.
 */
export function useAntiCheat() {
  const managerRef = useRef<AntiCheatManager | null>(null);
  const [setup, setSetup] = useState<AntiCheatSetupStatus>(
    AntiCheatManager.buildSetupStatus({})
  );
  const [monitoring, setMonitoring] = useState(false);
  const [cameraDisabled, setCameraDisabled] = useState(false);
  const [debug, setDebug] = useState<AntiCheatDebugSnapshot | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityState>(EMPTY_INTEGRITY);
  const [activeWarning, setActiveWarning] = useState<IntegrityStrike | null>(null);
  const debugIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminatedHandledRef = useRef(false);
  const onTerminatedRef = useRef<((state: IntegrityState) => void) | null>(null);

  const ensureManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = new AntiCheatManager();
    }
    return managerRef.current;
  }, []);

  const syncIntegrityFromManager = useCallback(() => {
    const mgr = managerRef.current;
    if (!mgr) return;
    const strikeMgr = mgr.getStrikeManager();
    setIntegrity(strikeMgr.getState());
    setActiveWarning(strikeMgr.getActiveWarning());
  }, []);

  useEffect(() => {
    const mgr = ensureManager();
    const strikeMgr = mgr.getStrikeManager();

    const unsub = strikeMgr.subscribe(() => {
      setIntegrity(strikeMgr.getState());
      setActiveWarning(strikeMgr.getActiveWarning());
    });

    const unsubTerm = strikeMgr.onTerminated((state) => {
      setIntegrity(state);
      setActiveWarning(null);
      if (!terminatedHandledRef.current) {
        terminatedHandledRef.current = true;
        onTerminatedRef.current?.(state);
      }
    });

    return () => {
      unsub();
      unsubTerm();
      if (debugIntervalRef.current) clearInterval(debugIntervalRef.current);
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, [ensureManager]);

  const setOnInterviewTerminated = useCallback(
    (cb: ((state: IntegrityState) => void) | null) => {
      onTerminatedRef.current = cb;
    },
    []
  );

  const restoreIntegrityState = useCallback(
    (sessionId: string): IntegrityState => {
      const mgr = ensureManager();
      const state = mgr.restoreIntegrity(sessionId);
      setIntegrity(state);
      if (state.terminated) {
        terminatedHandledRef.current = true;
      }
      return state;
    },
    [ensureManager]
  );

  const acknowledgeWarning = useCallback(() => {
    const mgr = managerRef.current;
    if (!mgr) return;
    mgr.getStrikeManager().acknowledgeWarning();
    syncIntegrityFromManager();
  }, [syncIntegrityFromManager]);

  const runSetup = useCallback(
    async (video: HTMLVideoElement | null) => {
      const mgr = ensureManager();
      setSetup(
        AntiCheatManager.buildSetupStatus({
          camera: video?.srcObject ? "checking" : "error",
          face: "checking",
          singleCandidate: "checking",
          phoneModel: "checking",
          integrity: "checking",
        })
      );

      if (!video || !(video.srcObject instanceof MediaStream)) {
        setSetup(
          AntiCheatManager.buildSetupStatus({
            camera: "error",
            face: "error",
            singleCandidate: "error",
            phoneModel: "unavailable",
            integrity: "error",
            errorMessage: "Camera unavailable",
          })
        );
        return false;
      }

      setSetup((s) => ({ ...s, camera: "ready" }));

      try {
        const { phoneAvailable } = await mgr.initialize();
        setSetup((s) => ({
          ...s,
          phoneModel: phoneAvailable ? "ready" : "unavailable",
        }));

        await new Promise((r) => setTimeout(r, 300));
        const { faceCount } = await mgr.probeFace(video);

        setSetup((s) => ({
          ...s,
          face: faceCount >= 1 ? "ready" : "error",
          singleCandidate: faceCount === 1 ? "ready" : faceCount > 1 ? "error" : "error",
          integrity: faceCount >= 1 ? "ready" : "error",
          errorMessage:
            faceCount === 0
              ? "No face detected — face the camera"
              : faceCount > 1
                ? "Multiple faces detected — only one candidate should be visible"
                : undefined,
        }));

        return faceCount === 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Setup failed";
        setSetup(
          AntiCheatManager.buildSetupStatus({
            camera: "ready",
            face: "error",
            singleCandidate: "error",
            phoneModel: "unavailable",
            integrity: "error",
            errorMessage: msg,
          })
        );
        return false;
      }
    },
    [ensureManager]
  );

  const startMonitoring = useCallback(
    async (video: HTMLVideoElement, sessionId: string): Promise<boolean> => {
      const mgr = ensureManager();
      await mgr.initialize();

      const prior = mgr.restoreIntegrity(sessionId);
      if (prior.terminated) {
        setIntegrity(prior);
        terminatedHandledRef.current = true;
        return false;
      }

      // Fresh monitoring session — reset strike counter for this attempt
      mgr.getStrikeManager().reset(sessionId);
      terminatedHandledRef.current = false;
      setIntegrity(mgr.getStrikeManager().getState());

      const interviewStartTime = performance.now();
      setCameraDisabled(false);

      await BrowserMonitor.requestFullscreenSafe();

      mgr.start(video, { sessionId, interviewStartTime });
      setMonitoring(mgr.isMonitoring());
      syncIntegrityFromManager();

      if (DEBUG_ANTI_CHEAT) {
        if (debugIntervalRef.current) clearInterval(debugIntervalRef.current);
        debugIntervalRef.current = setInterval(() => {
          setDebug(mgr.getDebugSnapshot());
        }, 500);
      }
      return mgr.isMonitoring();
    },
    [ensureManager, syncIntegrityFromManager]
  );

  const stopMonitoring = useCallback((): {
    summary: AntiCheatSummary;
  } | null => {
    const mgr = managerRef.current;
    if (!mgr || !mgr.isMonitoring()) {
      void BrowserMonitor.exitFullscreenSafe();
      setMonitoring(false);
      return null;
    }

    if (debugIntervalRef.current) {
      clearInterval(debugIntervalRef.current);
      debugIntervalRef.current = null;
    }

    const result = mgr.stop();
    void BrowserMonitor.exitFullscreenSafe();
    setMonitoring(false);
    setDebug(null);

    if (result.summary.cameraDisabledEvents > 0) {
      setCameraDisabled(true);
    }

    return { summary: result.summary };
  }, []);

  return {
    setup,
    monitoring,
    cameraDisabled,
    setCameraDisabled,
    debug,
    integrity,
    activeWarning,
    acknowledgeWarning,
    restoreIntegrityState,
    setOnInterviewTerminated,
    runSetup,
    startMonitoring,
    stopMonitoring,
    restoreReport: EventTracker.restore,
    loadIntegrityState: IntegrityStrikeManager.load,
  };
}
