"use client";

import dynamic from "next/dynamic";

// Lazy-load recharts client-side only to keep it out of the server bundle.
export const Sparkline = dynamic(() => import("./sparkline.impl"), { ssr: false });
