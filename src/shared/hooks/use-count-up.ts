"use client";

import { useState, useEffect } from "react";
import { animate } from "framer-motion";

/**
 * Animates a number from 0 to `target` on mount / when target changes.
 * `active` should be false while data is still loading so the animation
 * fires after real data arrives, not against a 0 placeholder.
 */
export function useCountUp(target: number, active: boolean, decimals = 0): string {
  const fmt = (v: number) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString();

  const [display, setDisplay] = useState(() => (active ? fmt(0) : fmt(target)));

  useEffect(() => {
    if (!active) {
      setDisplay(fmt(target));
      return;
    }
    const c = animate(0, target, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(fmt(v)),
    });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, active, decimals]);

  return display;
}
