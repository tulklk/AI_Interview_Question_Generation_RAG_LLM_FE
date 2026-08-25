"use client";

import React, { useEffect, useState } from "react";
import { Quote, Star } from "lucide-react";
import { useLanguage } from "@/shared/providers/language-context";
import { testimonials as staticTestimonials } from "@/features/guest/data/guest";
import { getPublicFeedbacks, type PublicFeedback } from "@/features/guest/services/feedback.service";
import { ScrollReveal } from "@/shared/components/common/scroll-reveal";
import { TiltCard } from "@/shared/components/common/tilt-card";
import { CosmicField } from "@/features/guest/components/cosmic-field";

/**
 * Transform a Cloudinary URL to request a small, optimised image.
 * Inserts `w_{w},h_{h},c_fill,f_auto,q_auto` right after `/upload/` so
 * Cloudinary serves a WebP thumbnail instead of the original high-res file.
 * Non-Cloudinary URLs are returned unchanged.
 */
function cloudinaryResize(url: string, w: number, h: number): string {
  return url.replace(/\/upload\/(?!w_\d)/, `/upload/w_${w},h_${h},c_fill,f_auto,q_auto/`);
}

// Predefined avatar colours — cycle through these for API items that have no avatarUrl
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
];

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const cardAnimations = ["slide-left", "fade-up", "slide-right"] as const;

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-7 flex flex-col gap-5 animate-pulse">
      <div className="w-6 h-5 bg-gray-100 dark:bg-gray-800 rounded" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/6" />
      </div>
      <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-24" />
          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-32" />
        </div>
      </div>
    </div>
  );
}

// ── Star row ──────────────────────────────────────────────────────────────────

function StarRow({ value }: { value: number }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-0.5 mb-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={
            i < value
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          }
        />
      ))}
    </div>
  );
}

// ── Testimonials Section ──────────────────────────────────────────────────────

export function TestimonialsSection() {
  const { t } = useLanguage();
  const tm = t.testimonials;

  const [items, setItems] = useState<PublicFeedback[] | null>(null); // null = loading
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPublicFeedbacks()
      .then((data) => {
        if (cancelled) return;
        if (data.length >= 1) {
          setItems(data);
        } else {
          // BE returned empty — fall back to static
          setUseFallback(true);
          setItems([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUseFallback(true);
          setItems([]);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const loading = items === null;

  return (
    <section className="relative bg-page-bg dark:bg-[#0b0f1a] py-20 px-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <CosmicField variant="compact" />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto">
        <ScrollReveal animation="fade-up" className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            {tm.sectionLabel}
          </p>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{tm.headline}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-lg mx-auto text-base leading-relaxed">
            {tm.subtext}
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Loading skeletons */}
          {loading && Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}

          {/* Fallback to static i18n data */}
          {!loading && useFallback &&
            staticTestimonials.map((person, i) => {
              const item = tm.items[i];
              return (
                <ScrollReveal
                  key={person.id}
                  animation={cardAnimations[i % 3]}
                  delay={i * 80}
                  className="h-full"
                >
                  <TiltCard className="h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-7 flex flex-col gap-5">
                    <Quote size={22} className="text-primary/30 shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1 italic">
                      &ldquo;{item?.quote ?? person.quote}&rdquo;
                    </p>
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${person.avatarColor}`}
                      >
                        {person.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {item?.name ?? person.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item?.role ?? person.role} · {item?.company ?? person.company}
                        </p>
                      </div>
                    </div>
                  </TiltCard>
                </ScrollReveal>
              );
            })}

          {/* Real API data */}
          {!loading && !useFallback && items!.map((fb, i) => {
            const color = AVATAR_COLORS[i % AVATAR_COLORS.length]!;
            const nameInitials = initials(fb.authorName || "?");

            return (
              <ScrollReveal
                key={fb.id}
                animation={cardAnimations[i % 3]}
                delay={i * 80}
                className="h-full"
              >
                <div
                  className="testimonial-card-enter h-full"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                <TiltCard className="h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-7 flex flex-col gap-5">
                  <div className="flex items-start justify-between">
                    <Quote size={22} className="text-primary/30 shrink-0" />
                    {fb.rating > 0 && <StarRow value={fb.rating} />}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1 italic">
                    &ldquo;{fb.content}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                    {fb.authorAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cloudinaryResize(fb.authorAvatarUrl, 80, 80)}
                        alt={fb.authorName}
                        width={80}
                        height={80}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-full object-cover shrink-0 transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 transition-transform duration-300 hover:scale-110 ${color}`}
                        style={{ animation: `popIn 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 90 + 200}ms both` }}
                      >
                        {nameInitials}
                      </div>
                    )}
                    <div
                      className="feedback-section"
                      style={{ animationDelay: `${i * 90 + 150}ms` }}
                    >
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {fb.authorName}
                      </p>
                    </div>
                  </div>
                </TiltCard>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
