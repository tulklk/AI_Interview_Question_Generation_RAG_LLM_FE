"use client";

import { useCallback, useRef, type MouseEvent, type RefObject } from "react";

interface UseTiltOptions {
  /** Maximum rotation in degrees applied at the card edges. */
  maxTilt?: number;
  /** Uniform scale applied while hovering. */
  scale?: number;
  /** Perspective distance (px) for the 3D transform. */
  perspective?: number;
}

interface UseTiltResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  onMouseMove: (e: MouseEvent<T>) => void;
  onMouseLeave: () => void;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Pointer-driven 3D tilt. Attach `ref` to the element and spread the returned
 * handlers. Also exposes `--glare-x` / `--glare-y` / `--glare-opacity` CSS
 * variables so an optional glare layer can follow the cursor.
 *
 * No-op when the user prefers reduced motion.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>({
  maxTilt = 8,
  scale = 1.015,
  perspective = 900,
}: UseTiltOptions = {}): UseTiltResult<T> {
  const ref = useRef<T>(null);

  const onMouseMove = useCallback(
    (e: MouseEvent<T>) => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rotateY = (px - 0.5) * 2 * maxTilt;
      const rotateX = (0.5 - py) * 2 * maxTilt;
      el.style.transform = `perspective(${perspective}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`;
      el.style.setProperty("--glare-x", `${px * 100}%`);
      el.style.setProperty("--glare-y", `${py * 100}%`);
      el.style.setProperty("--glare-opacity", "1");
    },
    [maxTilt, scale, perspective],
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    el.style.setProperty("--glare-opacity", "0");
  }, [perspective]);

  return { ref, onMouseMove, onMouseLeave };
}
