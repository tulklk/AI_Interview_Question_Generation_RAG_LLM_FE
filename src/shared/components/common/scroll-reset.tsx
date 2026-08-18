"use client";

/**
 * ScrollReset — forces every full-page load to start at the very top.
 *
 * - Sets `history.scrollRestoration = "manual"` so the browser does NOT
 *   restore the previous scroll position on refresh or back/forward nav.
 * - Immediately jumps to (0, 0) via `behavior: "instant"` (no smooth animation).
 *
 * Rendered once in the root layout — produces no DOM output.
 */
import { useEffect } from "react";

export function ScrollReset() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Tell the browser to stop managing scroll position automatically
    window.history.scrollRestoration = "manual";
    // Snap to top on every mount (handles initial load + HMR reloads in dev)
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return null;
}
