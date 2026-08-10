"use client";

import { useMemo, useId } from "react";
import { motion } from "framer-motion";

interface SparklineProps {
  data: number[];
  color?: string;
}

const W = 64;
const H = 32;
const PAD = 2;

export default function Sparkline({ data, color = "#7C3AED" }: SparklineProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `sg-${uid}`;

  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) return { linePath: "", areaPath: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
      x: PAD + (i / (data.length - 1)) * (W - PAD * 2),
      y: PAD + (1 - (v - min) / range) * (H - PAD * 2),
    }));
    const line = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    const area = [
      line,
      `L${pts[pts.length - 1].x.toFixed(1)},${(H - PAD).toFixed(1)}`,
      `L${pts[0].x.toFixed(1)},${(H - PAD).toFixed(1)}`,
      "Z",
    ].join(" ");
    return { linePath: line, areaPath: area };
  }, [data]);

  if (!linePath) return null;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={color} stopOpacity={0.28} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Area fill — fades in after the line finishes drawing */}
      <motion.path
        d={areaPath}
        fill={`url(#${gradId})`}
        stroke="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
      />

      {/* Line — draws from left to right via pathLength */}
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      />
    </svg>
  );
}
