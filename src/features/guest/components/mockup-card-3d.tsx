"use client";

/**
 * MockupCard3D — CSS-3D interactive card.
 *
 * Energy trail: drawn once on a shared offscreen canvas each RAF frame,
 * then composited onto both the front canvas and the back canvas so the
 * light runs simultaneously on both faces.
 */

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { KEYWORD_ICONS } from "@/features/guest/components/keyword-icons";

const CHIPS = ["React", "TypeScript", "Next.js", "SSR", "REST API"] as const;

const CW    = 480;
const CH    = 610;
const T     = 14;
const R     = 20;
const R_OUT = R + 4;

const ENERGY_PERI =
  2 * (CW - 2 * R_OUT) + 2 * (CH - 2 * R_OUT) + 2 * Math.PI * R_OUT;

interface MockupCard3DProps {
  title: string;
  jdLabel: string;
  jdText: string;
  kwLabel: string;
  question: string;
  aiLabel: string;
  aiAnswer: string;
  className?: string;
}

export function MockupCard3D({
  title, jdLabel, jdText, kwLabel, question, aiLabel, aiAnswer, className = "",
}: MockupCard3DProps) {
  const wrapperRef    = useRef<HTMLDivElement>(null);
  const sceneRef      = useRef<HTMLDivElement>(null);
  const canvasFRef    = useRef<HTMLCanvasElement>(null); // front
  const canvasBRef    = useRef<HTMLCanvasElement>(null); // back

  useEffect(() => {
    const wrapper   = wrapperRef.current;
    const scene     = sceneRef.current;
    const canvasF   = canvasFRef.current;
    const canvasB   = canvasBRef.current;
    if (!wrapper || !scene || !canvasF || !canvasB) return;

    // ── Hi-DPI setup for both canvases ───────────────────────────────────
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = CW + 8, H = CH + 8;

    const setupCanvas = (c: HTMLCanvasElement) => {
      c.width = W * dpr; c.height = H * dpr;
      const cx = c.getContext("2d")!;
      cx.scale(dpr, dpr);
      cx.lineCap = "round"; cx.lineJoin = "round";
      return cx;
    };
    const ctxF = setupCanvas(canvasF);
    const ctxB = setupCanvas(canvasB);

    // ── Shared offscreen (built once, pasted to both canvases) ───────────
    const off = document.createElement("canvas");
    off.width = W * dpr; off.height = H * dpr;
    const offCtx = off.getContext("2d")!;
    offCtx.scale(dpr, dpr);
    offCtx.lineCap = "round"; offCtx.lineJoin = "round";

    // ── posOnRect ─────────────────────────────────────────────────────────
    const _x0 = 4, _y0 = 4, _x1 = 4 + CW, _y1 = 4 + CH;
    const _arc = (Math.PI / 2) * R_OUT;
    const _tw  = CW - 2 * R_OUT, _sh = CH - 2 * R_OUT;
    const _seg = [_tw, _arc, _sh, _arc, _tw, _arc, _sh, _arc] as const;

    function posOnRect(dist: number): [number, number] {
      let d = ((dist % ENERGY_PERI) + ENERGY_PERI) % ENERGY_PERI;
      let acc = 0;
      for (let i = 0; i < 8; i++) {
        const len = _seg[i];
        if (d < acc + len) {
          const t = (d - acc) / len;
          switch (i) {
            case 0: return [_x0 + R_OUT + t * _tw, _y0];
            case 1: { const a = -Math.PI/2 + t*Math.PI/2; return [_x1-R_OUT + Math.cos(a)*R_OUT, _y0+R_OUT + Math.sin(a)*R_OUT]; }
            case 2: return [_x1, _y0 + R_OUT + t * _sh];
            case 3: { const a =  t*Math.PI/2;              return [_x1-R_OUT + Math.cos(a)*R_OUT, _y1-R_OUT + Math.sin(a)*R_OUT]; }
            case 4: return [_x1 - R_OUT - t * _tw, _y1];
            case 5: { const a =  Math.PI/2 + t*Math.PI/2; return [_x0+R_OUT + Math.cos(a)*R_OUT, _y1-R_OUT + Math.sin(a)*R_OUT]; }
            case 6: return [_x0, _y1 - R_OUT - t * _sh];
            default:{ const a =  Math.PI   + t*Math.PI/2; return [_x0+R_OUT + Math.cos(a)*R_OUT, _y0+R_OUT + Math.sin(a)*R_OUT]; }
          }
        }
        acc += len;
      }
      return [_x0 + R_OUT, _y0];
    }

    // ── Ghost border helper (used on both canvases) ───────────────────────
    function drawGhostBorder(cx: CanvasRenderingContext2D) {
      cx.beginPath();
      cx.moveTo(_x0 + R_OUT, _y0);
      cx.lineTo(_x1 - R_OUT, _y0);
      cx.arcTo(_x1, _y0, _x1, _y0 + R_OUT, R_OUT);
      cx.lineTo(_x1, _y1 - R_OUT);
      cx.arcTo(_x1, _y1, _x1 - R_OUT, _y1, R_OUT);
      cx.lineTo(_x0 + R_OUT, _y1);
      cx.arcTo(_x0, _y1, _x0, _y1 - R_OUT, R_OUT);
      cx.lineTo(_x0, _y0 + R_OUT);
      cx.arcTo(_x0, _y0, _x0 + R_OUT, _y0, R_OUT);
      cx.closePath();
      cx.globalAlpha = 1;
      cx.strokeStyle = "rgba(139,92,246,0.22)";
      cx.lineWidth   = 1.2;
      cx.stroke();
    }

    // ── Card-rotation state ───────────────────────────────────────────────
    let rx = 8, ry = -18, s = 1;
    let velX = 0, velY = 0;
    let dragging = false, hovering = false;
    let lastX = 0, lastY = 0;
    let tgtRx = 8, tgtRy = -18;
    let autoIdle = true, lastInteraction = 0;
    let energyOffset = 0;
    const IDLE_RESUME = 3000;
    const TAIL_LEN    = 720;

    const apply = () => {
      scene.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
    };

    // ── RAF ───────────────────────────────────────────────────────────────
    let rafId = 0;
    const tick = () => {
      rafId = requestAnimationFrame(tick);

      // ── Build offscreen trail (shared) ──
      energyOffset += 0.9;
      if (energyOffset > ENERGY_PERI) energyOffset -= ENERGY_PERI;

      offCtx.clearRect(0, 0, W, H);
      offCtx.globalCompositeOperation = "source-over";
      offCtx.globalAlpha = 1;

      offCtx.beginPath();
      const N = 120;
      for (let i = 0; i <= N; i++) {
        const [px, py] = posOnRect(energyOffset - TAIL_LEN + (i / N) * TAIL_LEN);
        i === 0 ? offCtx.moveTo(px, py) : offCtx.lineTo(px, py);
      }

      offCtx.globalAlpha = 0.55;
      offCtx.strokeStyle = "rgba(109,40,217,1)";
      offCtx.lineWidth   = 11;
      offCtx.stroke();

      offCtx.globalAlpha = 0.82;
      offCtx.strokeStyle = "rgba(139,92,246,1)";
      offCtx.lineWidth   = 4;
      offCtx.stroke();

      offCtx.globalAlpha = 1;
      offCtx.strokeStyle = "rgba(216,180,254,1)";
      offCtx.lineWidth   = 1.5;
      offCtx.stroke();

      // Radial gradient mask (destination-in) — smooth fade, zero banding
      const [hx, hy] = posOnRect(energyOffset);
      const mask = offCtx.createRadialGradient(hx, hy, 0, hx, hy, TAIL_LEN * 0.95);
      mask.addColorStop(0,    "rgba(0,0,0,1)");
      mask.addColorStop(0.25, "rgba(0,0,0,0.88)");
      mask.addColorStop(0.55, "rgba(0,0,0,0.35)");
      mask.addColorStop(0.8,  "rgba(0,0,0,0.05)");
      mask.addColorStop(1,    "rgba(0,0,0,0)");
      offCtx.globalCompositeOperation = "destination-in";
      offCtx.globalAlpha = 1;
      offCtx.fillStyle = mask;
      offCtx.fillRect(0, 0, W, H);
      offCtx.globalCompositeOperation = "source-over";

      // ── Paste to FRONT canvas ──
      ctxF.clearRect(0, 0, W, H);
      drawGhostBorder(ctxF);
      ctxF.drawImage(off, 0, 0, W, H);

      // ── Paste to BACK canvas ──
      ctxB.clearRect(0, 0, W, H);
      drawGhostBorder(ctxB);
      ctxB.drawImage(off, 0, 0, W, H);

      // ── Card rotation ──
      if (dragging) {
        // handled in onMove
      } else if (autoIdle) {
        ry += 0.12; rx += (5 - rx) * 0.015;
      } else {
        // Hovering: gently follow cursor target position
        if (hovering) {
          rx += (tgtRx - rx) * 0.08;
          ry += (tgtRy - ry) * 0.08;
        }
      }
      apply();
    };
    tick();

    // ── Pointer events ────────────────────────────────────────────────────
    const onDown = (e: PointerEvent) => {
      dragging = true; autoIdle = false; velX = 0; velY = 0;
      lastX = e.clientX; lastY = e.clientY;
      wrapper.setPointerCapture(e.pointerId);
      wrapper.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (dragging) {
        const dx = e.clientX - lastX, dy = e.clientY - lastY;
        velY = velY * 0.65 + dx * 0.5 * 0.35;
        velX = velX * 0.65 + dy * 0.5 * 0.35;
        ry += dx * 0.5; rx += dy * 0.5;
        lastX = e.clientX; lastY = e.clientY;
      } else if (hovering && !autoIdle) {
        const rect = wrapper.getBoundingClientRect();
        tgtRx = ((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * -10;
        tgtRy = ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) *  16;
      }
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      wrapper.style.cursor = hovering ? "grab" : "grab";
      // If mouse already left the card while dragging, resume idle spin immediately
      if (!hovering) { velX = 0; velY = 0; autoIdle = true; }
    };
    const onEnter = () => {
      // Mouse enters → pause the infinite idle spin, zero velocity
      hovering = true;
      autoIdle = false;
      velX = 0; velY = 0;
    };
    const onLeave = () => {
      // Mouse leaves → resume infinite spin immediately (no delay)
      hovering = false;
      dragging = false;
      velX = 0; velY = 0;
      autoIdle = true;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      s = Math.max(0.55, Math.min(1.75, s - e.deltaY * 0.0007));
      lastInteraction = performance.now(); autoIdle = false;
    };

    wrapper.addEventListener("pointerdown",   onDown);
    wrapper.addEventListener("pointermove",   onMove);
    wrapper.addEventListener("pointerup",     onUp);
    wrapper.addEventListener("pointercancel", onUp);
    wrapper.addEventListener("mouseenter",    onEnter);
    wrapper.addEventListener("mouseleave",    onLeave);
    wrapper.addEventListener("wheel",         onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(rafId);
      wrapper.removeEventListener("pointerdown",   onDown);
      wrapper.removeEventListener("pointermove",   onMove);
      wrapper.removeEventListener("pointerup",     onUp);
      wrapper.removeEventListener("pointercancel", onUp);
      wrapper.removeEventListener("mouseenter",    onEnter);
      wrapper.removeEventListener("mouseleave",    onLeave);
      wrapper.removeEventListener("wheel",         onWheel);
    };
  }, []);

  const aiIdx  = title.indexOf(" AI");
  const brand  = aiIdx > -1 ? title.slice(0, aiIdx)  : "HireGen";
  const suffix = aiIdx > -1 ? title.slice(aiIdx + 3) : "";

  const aiGradientStyle: React.CSSProperties = {
    background: "linear-gradient(90deg,#7c3aed,#818cf8,#22d3ee,#818cf8,#7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundSize: "300% auto",
    animation: "gradientShift 3s linear infinite",
  };

  // Shared canvas style factory
  const energyCanvasStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    top: -4, left: -4,
    width: CW + 8, height: CH + 8,
    pointerEvents: "none",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    ...extra,
  });

  return (
    <div
      ref={wrapperRef}
      className={`flex items-center justify-center select-none touch-none ${className}`}
      style={{ perspective: "1400px", cursor: "grab" }}
      aria-label="Kéo để xoay 360°, cuộn để zoom"
    >
      <div
        ref={sceneRef}
        style={{
          width: `${CW}px`, height: `${CH}px`,
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `rotateX(8deg) rotateY(-18deg)`,
          willChange: "transform",
        }}
      >

        {/* ── BACK face ── */}
        <div
          aria-hidden="true"
          style={{
            position:"absolute", inset:0,
            transform:"rotateY(180deg)",
            backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden",
            borderRadius:`${R}px`, overflow:"hidden",
          }}
        >
          <div className="absolute inset-0 dark:hidden" style={{ background:"linear-gradient(145deg,#ffffff 0%,#f3eeff 35%,#e9d5ff 65%,#f8f5ff 100%)" }} />
          <div className="absolute inset-0 hidden dark:block" style={{ background:"linear-gradient(145deg,#06001a 0%,#130336 35%,#1e0550 65%,#0a0120 100%)" }} />
          <div className="absolute inset-0" style={{ backgroundImage:"linear-gradient(rgba(124,58,237,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.07) 1px,transparent 1px)", backgroundSize:"60px 60px" }} />
          <div className="absolute" style={{ width:320, height:320, borderRadius:"50%", background:"radial-gradient(circle,rgba(109,40,217,0.22) 0%,transparent 70%)", top:-80, right:-60 }} />
          <div className="absolute" style={{ width:260, height:260, borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.15) 0%,transparent 70%)", bottom:-60, left:-50 }} />
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background:"linear-gradient(90deg,transparent,rgba(167,139,250,0.35),transparent)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2.5">
              <span className="text-gray-900 dark:text-white/95" style={{ fontSize:52, fontWeight:800, fontFamily:"system-ui,sans-serif", letterSpacing:"-1px" }}>HireGen</span>
              <span style={{ fontSize:52, fontWeight:800, fontFamily:"system-ui,sans-serif", ...aiGradientStyle }}>AI</span>
            </div>
            <div className="text-[13px] text-gray-400 dark:text-white/35 mt-1.5" style={{ fontFamily:"system-ui,sans-serif" }}>RAG + LLM Interview Platform</div>
          </div>
        </div>

        {/* ── BACK energy canvas — shows when back face faces viewer ── */}
        <canvas
          ref={canvasBRef}
          aria-hidden="true"
          style={energyCanvasStyle({ transform: "rotateY(180deg) translateZ(0.5px)" })}
        />

        {/* ── FRONT face ── */}
        <div
          style={{
            position:"absolute", inset:0,
            backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden",
            borderRadius:`${R}px`, overflow:"hidden",
            boxShadow:"0 32px 80px -12px rgba(0,0,0,0.45),0 0 0 1px rgba(108,71,255,0.18)",
          }}
          className="bg-white dark:bg-[#0f1117]"
        >
          <div className="flex items-center gap-3 px-5 py-3.5 bg-page-bg dark:bg-gray-800/90 border-b border-gray-100 dark:border-gray-700/70 shrink-0">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-400 block" />
              <span className="w-3 h-3 rounded-full bg-amber-400 block" />
              <span className="w-3 h-3 rounded-full bg-emerald-400 block" />
            </div>
            <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400 ml-1 flex items-center gap-1 min-w-0">
              <span className="font-semibold text-gray-700 dark:text-gray-200 shrink-0">{brand}</span>
              <span className="font-bold shrink-0" style={aiGradientStyle}>AI</span>
              <span className="truncate">{suffix}</span>
            </span>
          </div>
          <div className="p-4 flex flex-col gap-3" style={{ height:"calc(100% - 52px)" }}>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900/60 p-3.5 shrink-0">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-5.5 h-5.5 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[11px] shrink-0">📄</div>
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{jdLabel}</span>
              </div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed bg-gray-50 dark:bg-gray-800/80 rounded-lg px-3 py-2.5 border border-gray-100 dark:border-gray-700/60 line-clamp-3">{jdText}</div>
            </div>
            <div className="rounded-xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-900/60 p-3.5 shrink-0">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-[12px]">🏷</span>
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{kwLabel}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CHIPS.map((k) => {
                  const cfg = KEYWORD_ICONS[k]; const Icon = cfg?.icon;
                  return (
                    <span key={k} className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                      {Icon && <Icon size={11} className={cfg.className} />}{k}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 dark:border-gray-700/80 bg-white dark:bg-gray-900/60 p-3.5 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-1.5 mb-2.5 shrink-0">
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Medium</span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">Next.js</span>
              </div>
              <p className="text-[13px] font-semibold text-gray-800 dark:text-gray-100 leading-snug mb-2.5 line-clamp-2 shrink-0">{question}</p>
              <div className="rounded-lg bg-lavender dark:bg-primary/10 border border-primary/15 px-3 py-2.5 flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-1 mb-1.5 shrink-0">
                  <Sparkles size={10} className="text-primary shrink-0" />
                  <span className="text-[10px] font-semibold text-primary">{aiLabel}</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed overflow-hidden flex-1">{aiAnswer}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── FRONT energy canvas — shows when front face faces viewer ── */}
        <canvas
          ref={canvasFRef}
          aria-hidden="true"
          style={energyCanvasStyle({ transform: "translateZ(0.5px)" })}
        />

        {/* ── EDGES ── */}
        {(["rotateY(90deg)", "rotateY(-90deg)"] as const).map((rot) => (
          <div key={rot} aria-hidden="true">
            <div style={{ position:"absolute", left:"50%", top:`${R}px`, marginLeft:`-${T/2}px`, width:`${T}px`, height:`${CH-R*2}px`, transform:`${rot} translateZ(${CW/2}px)`, background:"linear-gradient(180deg,#3b1fa8 0%,#6d28d9 50%,#3b1fa8 100%)" }} />
            <div style={{ position:"absolute", left:"50%", top:0,           marginLeft:`-${T/2}px`, width:`${T}px`, height:`${R}px`, transform:`${rot} translateZ(${CW/2}px)`, background:"#3b1fa8" }} />
            <div style={{ position:"absolute", left:"50%", top:`${CH-R}px`, marginLeft:`-${T/2}px`, width:`${T}px`, height:`${R}px`, transform:`${rot} translateZ(${CW/2}px)`, background:"#3b1fa8" }} />
          </div>
        ))}
        {(["rotateX(90deg)", "rotateX(-90deg)"] as const).map((rot) => (
          <div key={rot} aria-hidden="true">
            <div style={{ position:"absolute", left:`${R}px`,    top:"50%", marginTop:`-${T/2}px`, width:`${CW-R*2}px`, height:`${T}px`, transform:`${rot} translateZ(${CH/2}px)`, background:"linear-gradient(90deg,#3b1fa8 0%,#6d28d9 50%,#3b1fa8 100%)" }} />
            <div style={{ position:"absolute", left:0,            top:"50%", marginTop:`-${T/2}px`, width:`${R}px`,      height:`${T}px`, transform:`${rot} translateZ(${CH/2}px)`, background:"#3b1fa8" }} />
            <div style={{ position:"absolute", left:`${CW-R}px`, top:"50%", marginTop:`-${T/2}px`, width:`${R}px`,      height:`${T}px`, transform:`${rot} translateZ(${CH/2}px)`, background:"#3b1fa8" }} />
          </div>
        ))}

      </div>
    </div>
  );
}
