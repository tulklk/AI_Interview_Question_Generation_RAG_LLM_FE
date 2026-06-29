"use client";

import { useEffect, useState } from "react";

const DEFAULT_DURATION_MS = 280;

/**
 * Keeps overlay/panel mounted while exit animation plays.
 * Returns `mounted` (render in DOM) and `exiting` (apply exit animation classes).
 */
export function useOverlayTransition(open: boolean, durationMs = DEFAULT_DURATION_MS) {
  const [phase, setPhase] = useState<"closed" | "open" | "closing">(
    open ? "open" : "closed"
  );

  useEffect(() => {
    if (open) {
      setPhase("open");
      return;
    }

    setPhase((current) => (current === "open" ? "closing" : current === "closing" ? "closing" : "closed"));
  }, [open]);

  useEffect(() => {
    if (phase !== "closing") return;

    const timer = setTimeout(() => setPhase("closed"), durationMs);
    return () => clearTimeout(timer);
  }, [phase, durationMs]);

  return {
    mounted: phase !== "closed",
    exiting: phase === "closing",
  };
}
