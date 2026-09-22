"use client";

import { useEffect, useState } from "react";

const COLLAPSE_KEY = "hr-sidebar-collapsed";

/** Sync with HR sidebar collapse (same-tab + cross-tab). */
export function useHrSidebarCollapsed(): boolean {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    function read() {
      try {
        setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
      } catch {
        setCollapsed(false);
      }
    }
    read();
    function onStorage(e: StorageEvent) {
      if (e.key === COLLAPSE_KEY) read();
    }
    function onCustom() {
      read();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("hr-sidebar-collapsed-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("hr-sidebar-collapsed-changed", onCustom);
    };
  }, []);

  return collapsed;
}

export function hrSidebarSpacerClass(collapsed: boolean): string {
  return collapsed ? "w-16" : "w-68";
}

export function hrSidebarLeftOffsetClass(collapsed: boolean): string {
  return collapsed ? "lg:left-16" : "lg:left-68";
}
