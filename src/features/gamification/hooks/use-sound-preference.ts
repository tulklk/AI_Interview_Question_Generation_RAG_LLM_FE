"use client";

import { useCallback, useEffect, useState } from "react";

export const SOUND_STORAGE_KEY = "hiregen:sound";

/** Returns true if the user hasn't explicitly disabled sounds. */
export function isSoundEnabled(): boolean {
  try {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Hook for reading and toggling the sound preference. Syncs to localStorage. */
export function useSoundPreference() {
  const [soundEnabled, setSoundEnabledState] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
    } catch { /* storage unavailable */ }
  }, []);

  return { soundEnabled, setSoundEnabled };
}
