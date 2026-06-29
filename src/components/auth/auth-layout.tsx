import { ReactNode } from "react";
import { LoginHero } from "@/components/auth/login-hero";
import { Auth3DVisual } from "@/components/auth/auth-3d-visual";
import { BrandLogo } from "@/components/shared/brand-logo";

interface AuthLayoutProps {
  children: ReactNode;
  /** Extra classes for the scrollable form area (e.g. centering vs top-aligned). */
  formAreaClassName?: string;
}

// Particle positions for the form-side drifting particles (light: dust, dark: stars)
const particlePositions = [
  { x: "8%", y: "12%", size: 4, delay: 0, dur: 14 },
  { x: "85%", y: "8%", size: 3, delay: 1.5, dur: 16 },
  { x: "20%", y: "75%", size: 5, delay: 0.8, dur: 18 },
  { x: "70%", y: "85%", size: 3, delay: 2.2, dur: 15 },
  { x: "45%", y: "30%", size: 2, delay: 3, dur: 12 },
  { x: "92%", y: "55%", size: 4, delay: 1.1, dur: 17 },
  { x: "12%", y: "45%", size: 2, delay: 2.6, dur: 13 },
  { x: "60%", y: "15%", size: 3, delay: 0.4, dur: 19 },
];

export function AuthLayout({ children, formAreaClassName = "items-center justify-center" }: AuthLayoutProps) {
  return (
    <div className="auth-page flex h-screen overflow-hidden">
      {/* Multi-layer background, toggled by theme */}
      <div className="auth-light-bg" />
      <div className="auth-dark-bg" />
      <div className="auth-aurora" />

      {/* Left — premium marketing panel */}
      <div className="auth-left-panel hidden lg:flex w-[55%] shrink-0 animate-slide-left">
        <div className="auth-left-grid" />
        <Auth3DVisual />
        <LoginHero />
      </div>

      {/* Right — form panel */}
      <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden animate-slide-right">
        <div className="auth-grid-pattern" />
        <div className="auth-particles">
          {particlePositions.map((p, i) => (
            <div
              key={i}
              className="auth-particle"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.dur}s`,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0 pointer-events-none">
          <div className="auth-panel-orb auth-panel-orb--1" style={{ width: 360, height: 360, top: -80, right: -70 }} />
          <div className="auth-panel-orb auth-panel-orb--2" style={{ width: 300, height: 300, bottom: -80, left: -60 }} />
          <div className="auth-panel-orb auth-panel-orb--3" style={{ width: 220, height: 220, top: "40%", right: "16%" }} />
        </div>

        <div className="absolute top-6 right-6 sm:right-8 z-20 animate-fade-in">
          <BrandLogo
            href="/"
            className="justify-end max-w-[min(100%,280px)]"
            logoClassName="w-10 h-10 auth-logo-pulse"
            titleClassName="text-[16px]"
            subtitleClassName="text-[11px]"
          />
        </div>

        <div className={`relative z-10 flex-1 overflow-y-auto px-6 sm:px-8 pt-20 pb-10 flex auth-card-3d-perspective ${formAreaClassName}`}>
          <div className="auth-glass-card w-full max-w-lg px-6 sm:px-10 py-8 sm:py-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
