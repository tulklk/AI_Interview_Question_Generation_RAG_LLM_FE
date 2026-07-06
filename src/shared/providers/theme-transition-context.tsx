"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Phase = "idle" | "closing" | "opening";

interface ThemeTransitionContextValue {
  triggerTransition: (onMidpoint: () => void, nextTheme: "light" | "dark") => void;
  isTransitioning: boolean;
}

const ThemeTransitionContext = createContext<ThemeTransitionContextValue>({
  triggerTransition: (cb) => cb(),
  isTransitioning: false,
});

export function useThemeTransition() {
  return useContext(ThemeTransitionContext);
}

function SunIcon({ color }: { color: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeTransitionProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [nextTheme, setNextTheme] = useState<"light" | "dark">("light");
  const midpointCb = useRef<() => void>(() => {});

  const triggerTransition = useCallback(
    (onMidpoint: () => void, theme: "light" | "dark") => {
      if (phase !== "idle") return;
      midpointCb.current = onMidpoint;
      setNextTheme(theme);
      setPhase("closing");
    },
    [phase]
  );

  const isToLight = nextTheme === "light";

  // Panel: darker at outer edge, lighter/glowing at inner (seam) edge
  const leftPanelBg  = isToLight
    ? "linear-gradient(to right, #d8d8ea, #f8f8ff)"
    : "linear-gradient(to right, #04040a, #12121e)";
  const rightPanelBg = isToLight
    ? "linear-gradient(to left,  #d8d8ea, #f8f8ff)"
    : "linear-gradient(to left,  #04040a, #12121e)";

  // Seam glow
  const seamRgb   = isToLight ? "110, 80, 255"  : "160, 120, 255";
  const seamAlpha = isToLight ? 0.42 : 0.68;
  const glowSpread = isToLight ? "22px 9px" : "30px 12px";

  // Icon
  const iconColor  = isToLight ? "#1a0f50" : "#e0d4ff";
  const iconBg     = isToLight ? "rgba(210, 200, 255, 0.20)" : "rgba(55, 38, 120, 0.28)";
  const iconBorder = `rgba(${seamRgb}, 0.38)`;
  const iconGlow   = `0 0 26px 9px rgba(${seamRgb}, ${isToLight ? 0.18 : 0.30})`;

  return (
    <ThemeTransitionContext.Provider value={{ triggerTransition, isTransitioning: phase !== "idle" }}>
      {children}
      {phase !== "idle" && (
        <>
          <style>{`
            @keyframes tc-close-L {
              from { transform: translateX(-100%); }
              to   { transform: translateX(0); }
            }
            @keyframes tc-close-R {
              from { transform: translateX(100%); }
              to   { transform: translateX(0); }
            }
            @keyframes tc-open-L {
              from { transform: translateX(0); }
              to   { transform: translateX(-100%); }
            }
            @keyframes tc-open-R {
              from { transform: translateX(0); }
              to   { transform: translateX(100%); }
            }
            @keyframes tc-seam-in {
              0%   { opacity: 0; transform: scaleY(0.25); }
              100% { opacity: 1; transform: scaleY(1); }
            }
            @keyframes tc-seam-out {
              0%   { opacity: 1; transform: scaleY(1); }
              100% { opacity: 0; transform: scaleY(0.25); }
            }
            @keyframes tc-icon-in {
              0%   { opacity: 0; transform: scale(0.25) rotate(-25deg); }
              55%  { opacity: 1; transform: scale(1.15) rotate(5deg); }
              80%  { transform: scale(0.95) rotate(-1deg); }
              100% { opacity: 1; transform: scale(1) rotate(0deg); }
            }
            @keyframes tc-icon-out {
              0%   { opacity: 1; transform: scale(1) rotate(0deg); }
              30%  { transform: scale(1.08) rotate(-4deg); }
              100% { opacity: 0; transform: scale(0.25) rotate(25deg); }
            }
            @keyframes tc-ring-1 {
              0%   { transform: scale(0.6); opacity: 0.6; }
              100% { transform: scale(2.8); opacity: 0; }
            }
            @keyframes tc-ring-2 {
              0%   { transform: scale(0.6); opacity: 0.35; }
              100% { transform: scale(3.8); opacity: 0; }
            }
          `}</style>

          <div key={phase} style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 99999 }}>

            {/* Left panel */}
            <div style={{
              position: "absolute", left: 0, top: 0, width: "50%", height: "100%",
              background: leftPanelBg,
              animation: `${phase === "closing" ? "tc-close-L" : "tc-open-L"} 380ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
            }} />

            {/* Right panel */}
            <div
              style={{
                position: "absolute", right: 0, top: 0, width: "50%", height: "100%",
                background: rightPanelBg,
                animation: `${phase === "closing" ? "tc-close-R" : "tc-open-R"} 380ms cubic-bezier(0.16, 1, 0.3, 1) forwards`,
              }}
              onAnimationEnd={
                phase === "closing"
                  ? () => { midpointCb.current(); setPhase("opening"); }
                  : () => setPhase("idle")
              }
            />

            {/* Seam glow strip */}
            <div style={{
              position: "absolute",
              left: "calc(50% - 1px)", top: "5%", bottom: "5%",
              width: "2px",
              background: `linear-gradient(to bottom, transparent, rgba(${seamRgb}, ${seamAlpha}) 20%, rgba(${seamRgb}, ${seamAlpha}) 80%, transparent)`,
              boxShadow: `0 0 ${glowSpread} rgba(${seamRgb}, ${isToLight ? 0.28 : 0.50})`,
              transformOrigin: "center",
              animation: `${phase === "closing" ? "tc-seam-in" : "tc-seam-out"} 380ms ease-out forwards`,
            }} />

            {/* Ring burst 1 (tighter) */}
            <div style={{
              position: "absolute",
              top: "50%", left: "50%",
              marginTop: "-36px", marginLeft: "-36px",
              width: "72px", height: "72px",
              borderRadius: "50%",
              border: `1.5px solid rgba(${seamRgb}, 0.55)`,
              animation: "tc-ring-1 420ms cubic-bezier(0.2, 0, 0.6, 1) forwards",
            }} />

            {/* Ring burst 2 (wider, delayed) */}
            <div style={{
              position: "absolute",
              top: "50%", left: "50%",
              marginTop: "-36px", marginLeft: "-36px",
              width: "72px", height: "72px",
              borderRadius: "50%",
              border: `1px solid rgba(${seamRgb}, 0.35)`,
              animation: "tc-ring-2 500ms cubic-bezier(0.2, 0, 0.6, 1) 60ms forwards",
              opacity: 0,
            }} />

            {/* Icon frosted glass circle */}
            <div style={{
              position: "absolute",
              top: "50%", left: "50%",
              marginTop: "-36px", marginLeft: "-36px",
              width: "72px", height: "72px",
              borderRadius: "50%",
              background: iconBg,
              border: `1.5px solid ${iconBorder}`,
              boxShadow: iconGlow,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: `${phase === "closing" ? "tc-icon-in" : "tc-icon-out"} 380ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
              pointerEvents: "none",
            }}>
              {nextTheme === "light" ? <SunIcon color={iconColor} /> : <MoonIcon color={iconColor} />}
            </div>

          </div>
        </>
      )}
    </ThemeTransitionContext.Provider>
  );
}
