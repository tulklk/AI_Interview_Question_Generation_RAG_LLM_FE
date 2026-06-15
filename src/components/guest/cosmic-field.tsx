const STAR_COLORS = [
  "rgba(108, 71, 255, 0.9)",   // purple (primary)
  "rgba(59, 130, 246, 0.85)",  // blue
  "rgba(236, 72, 153, 0.8)",   // pink
  "rgba(20, 184, 166, 0.8)",   // teal
  "rgba(245, 158, 11, 0.8)",   // amber
];

const STARS_FULL = [
  { x: 5,  y: 10, size: 4, color: 0, delay: 0.0, dur: 4.5 },
  { x: 14, y: 32, size: 3, color: 1, delay: 1.2, dur: 5.2 },
  { x: 24, y: 8,  size: 2, color: 2, delay: 2.4, dur: 3.8 },
  { x: 33, y: 55, size: 3, color: 3, delay: 0.6, dur: 4.8 },
  { x: 42, y: 18, size: 2, color: 4, delay: 1.8, dur: 4.2 },
  { x: 50, y: 70, size: 4, color: 0, delay: 0.9, dur: 5.6 },
  { x: 58, y: 12, size: 2, color: 1, delay: 3.0, dur: 3.6 },
  { x: 66, y: 45, size: 3, color: 2, delay: 1.5, dur: 4.9 },
  { x: 74, y: 25, size: 2, color: 3, delay: 2.7, dur: 4.1 },
  { x: 82, y: 60, size: 4, color: 4, delay: 0.3, dur: 5.4 },
  { x: 90, y: 15, size: 2, color: 0, delay: 1.9, dur: 3.9 },
  { x: 96, y: 38, size: 3, color: 1, delay: 2.2, dur: 4.6 },
  { x: 10, y: 78, size: 3, color: 2, delay: 0.5, dur: 5.0 },
  { x: 28, y: 88, size: 2, color: 3, delay: 1.4, dur: 4.3 },
  { x: 46, y: 92, size: 4, color: 4, delay: 2.6, dur: 5.8 },
  { x: 63, y: 82, size: 2, color: 0, delay: 0.8, dur: 4.0 },
  { x: 79, y: 90, size: 3, color: 1, delay: 1.7, dur: 4.7 },
  { x: 92, y: 78, size: 2, color: 2, delay: 2.9, dur: 3.7 },
  { x: 38, y: 38, size: 2, color: 3, delay: 3.3, dur: 4.4 },
  { x: 56, y: 58, size: 3, color: 4, delay: 0.2, dur: 5.1 },
];

const STARS_COMPACT = [
  { x: 6,  y: 16, size: 3, color: 0, delay: 0.0, dur: 4.6 },
  { x: 18, y: 70, size: 2, color: 1, delay: 1.3, dur: 4.0 },
  { x: 30, y: 30, size: 4, color: 2, delay: 2.5, dur: 5.4 },
  { x: 46, y: 82, size: 2, color: 3, delay: 0.7, dur: 3.9 },
  { x: 60, y: 14, size: 3, color: 4, delay: 1.9, dur: 4.8 },
  { x: 72, y: 55, size: 2, color: 0, delay: 3.1, dur: 4.2 },
  { x: 84, y: 24, size: 4, color: 1, delay: 0.4, dur: 5.2 },
  { x: 92, y: 68, size: 2, color: 2, delay: 2.0, dur: 4.5 },
  { x: 38, y: 60, size: 3, color: 3, delay: 1.1, dur: 5.0 },
];

const SHOOTING_STARS: { x: number; y: number; delay: number; dur: number; color: number; dir: "left" | "right" }[] = [
  { x: 10, y: 6,  delay: 0,  dur: 16, color: 0, dir: "right" },
  { x: 82, y: 4,  delay: 7,  dur: 19, color: 1, dir: "left" },
  { x: 30, y: 24, delay: 13, dur: 18, color: 2, dir: "right" },
];

interface CosmicFieldProps {
  /** "full" renders the dense star field plus shooting stars (used on the hero).
   *  "compact" renders a lighter star field for content sections. */
  variant?: "full" | "compact";
}

export function CosmicField({ variant = "full" }: CosmicFieldProps) {
  const stars = variant === "full" ? STARS_FULL : STARS_COMPACT;

  return (
    <>
      {stars.map((s, i) => (
        <div
          key={`star-${i}`}
          className="cosmic-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: STAR_COLORS[s.color],
            boxShadow: `0 0 ${s.size * 2}px ${STAR_COLORS[s.color]}`,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {variant === "full" &&
        SHOOTING_STARS.map((s, i) => (
          <div
            key={`shoot-${i}`}
            className={`cosmic-shooting-star cosmic-shooting-star--${s.dir}`}
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              background: `linear-gradient(90deg, transparent, ${STAR_COLORS[s.color]})`,
              boxShadow: `0 0 4px ${STAR_COLORS[s.color]}`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
    </>
  );
}
