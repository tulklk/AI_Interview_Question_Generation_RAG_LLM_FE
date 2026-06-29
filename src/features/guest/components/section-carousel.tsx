"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { BenefitsSection } from "./benefits-section";
import { FeaturesSection } from "./features-section";
import { WorkflowSection } from "./workflow-section";

const SLIDE_COUNT = 3;
const AUTO_PLAY_MS = 6500;

const SLIDES = [
  { id: "benefits", Component: BenefitsSection },
  { id: "features", Component: FeaturesSection },
  { id: "workflow", Component: WorkflowSection },
];

export function SectionCarousel() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const labels = [
    t.benefits.sectionLabel,
    t.features.sectionLabel,
    t.workflow.sectionLabel,
  ];

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDE_COUNT);
    }, AUTO_PLAY_MS);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const goTo = (index: number) => {
    setCurrent(index);
    startTimer();
  };

  const prev = () => {
    setCurrent((c) => (c - 1 + SLIDE_COUNT) % SLIDE_COUNT);
    startTimer();
  };

  const next = () => {
    setCurrent((c) => (c + 1) % SLIDE_COUNT);
    startTimer();
  };

  return (
    <div>
      {/* Tab navigation strip — sits ABOVE slides, no overlap */}
      <div className="relative z-10 flex justify-center gap-2 py-5 bg-white/70 dark:bg-gray-950/70 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => goTo(i)}
            className={`px-5 py-2 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all duration-300 ${
              i === current
                ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105"
                : "bg-transparent text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-[#a78bff]"
            }`}
          >
            <span className="hidden sm:inline">{label}</span>
            {/* Mobile: show index */}
            <span className="sm:hidden">{i + 1}</span>
          </button>
        ))}
      </div>

      {/* Slides area */}
      <div className="relative overflow-hidden">
        {/* Track */}
        <div
          className="flex transition-transform duration-700 ease-in-out will-change-transform"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {SLIDES.map(({ id, Component }) => (
            <div
              key={id}
              className="min-w-full flex flex-col [&>section]:flex-1 [&>section]:flex [&>section]:flex-col [&>section]:justify-center"
            >
              <Component />
            </div>
          ))}
        </div>

        {/* Prev arrow */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous section"
          className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-primary dark:hover:text-[#a78bff] transition-all duration-200"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Next arrow */}
        <button
          type="button"
          onClick={next}
          aria-label="Next section"
          className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-primary dark:hover:text-[#a78bff] transition-all duration-200"
        >
          <ChevronRight size={16} />
        </button>

        {/* Dot indicator */}
        <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center gap-2">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "w-7 h-2 bg-primary"
                  : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-primary/60"
              }`}
            />
          ))}
        </div>

        {/* Progress bar — resets and fills every AUTO_PLAY_MS ms */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/5 dark:bg-white/5 z-20">
          <div
            key={current}
            className="h-full bg-primary/70"
            style={{ animation: `carousel-progress ${AUTO_PLAY_MS}ms linear forwards` }}
          />
        </div>
      </div>

      <style>{`
        @keyframes carousel-progress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  );
}
