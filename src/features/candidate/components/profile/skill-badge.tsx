"use client";

import {
  X,
  Database,
  Key,
  Zap,
  GitBranch,
  Layers,
  CheckCheck,
  Play,
  Video,
  Navigation,
  Sparkles,
  Code2,
  Server,
  Shield,
  Cpu,
  Network,
  Workflow,
  Boxes,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { portalMutedBg, portalHeadingAlt } from "@/shared/utils/portal-ui";
import { getSkillIcon } from "@/features/candidate/utils/skill-icons";

// ── Visual config ──────────────────────────────────────────────────────────────

type LetterBadge = {
  kind: "letter";
  /** 2–3 char abbreviation shown inside the badge */
  abbrev: string;
  /** Brand background colour (CSS value) */
  bg: string;
  /** Foreground / text colour */
  fg: string;
};

type LucideBadge = {
  kind: "lucide";
  Icon: LucideIcon;
  /** Icon colour (CSS value) */
  color: string;
};

type SkillVisual = LetterBadge | LucideBadge;

// ── Skill → visual map (keys are lowercase-trimmed) ───────────────────────────

const SKILL_MAP: Record<string, SkillVisual> = {
  // ── Programming languages ─────────────────────────────────────────────────
  typescript:     { kind: "letter", abbrev: "TS",   bg: "#3178C6", fg: "#fff" },
  javascript:     { kind: "letter", abbrev: "JS",   bg: "#F7DF1E", fg: "#1a1a1a" },
  "c#":           { kind: "letter", abbrev: "C#",   bg: "#9B4F96", fg: "#fff" },
  "c++":          { kind: "letter", abbrev: "C++",  bg: "#00599C", fg: "#fff" },
  python:         { kind: "letter", abbrev: "Py",   bg: "#3776AB", fg: "#fff" },
  java:           { kind: "letter", abbrev: "Ja",   bg: "#ED8B00", fg: "#fff" },
  go:             { kind: "letter", abbrev: "Go",   bg: "#00ADD8", fg: "#fff" },
  golang:         { kind: "letter", abbrev: "Go",   bg: "#00ADD8", fg: "#fff" },
  rust:           { kind: "letter", abbrev: "Rs",   bg: "#CE422B", fg: "#fff" },
  php:            { kind: "letter", abbrev: "PHP",  bg: "#777BB4", fg: "#fff" },
  kotlin:         { kind: "letter", abbrev: "Kt",   bg: "#7F52FF", fg: "#fff" },
  swift:          { kind: "letter", abbrev: "Sw",   bg: "#F05138", fg: "#fff" },
  dart:           { kind: "letter", abbrev: "Dt",   bg: "#0175C2", fg: "#fff" },
  ruby:           { kind: "letter", abbrev: "Rb",   bg: "#CC342D", fg: "#fff" },
  scala:          { kind: "letter", abbrev: "Sc",   bg: "#DC322F", fg: "#fff" },

  // ── Web / Mobile frameworks ───────────────────────────────────────────────
  react:              { kind: "letter", abbrev: "Re",   bg: "#20232A", fg: "#61DAFB" },
  "react native":     { kind: "letter", abbrev: "RN",   bg: "#20232A", fg: "#61DAFB" },
  "next.js":          { kind: "letter", abbrev: "Nx",   bg: "#000",    fg: "#fff" },
  nextjs:             { kind: "letter", abbrev: "Nx",   bg: "#000",    fg: "#fff" },
  "vue.js":           { kind: "letter", abbrev: "Vu",   bg: "#42B883", fg: "#fff" },
  vuejs:              { kind: "letter", abbrev: "Vu",   bg: "#42B883", fg: "#fff" },
  angular:            { kind: "letter", abbrev: "Ng",   bg: "#DD0031", fg: "#fff" },
  svelte:             { kind: "letter", abbrev: "Sv",   bg: "#FF3E00", fg: "#fff" },
  flutter:            { kind: "letter", abbrev: "Fl",   bg: "#0553B1", fg: "#fff" },

  // ── Backend / API ─────────────────────────────────────────────────────────
  "asp.net core web api": { kind: "letter", abbrev: ".NET", bg: "#512BD4", fg: "#fff" },
  "asp.net core":         { kind: "letter", abbrev: ".NET", bg: "#512BD4", fg: "#fff" },
  "asp.net":              { kind: "letter", abbrev: ".NET", bg: "#512BD4", fg: "#fff" },
  ".net":                 { kind: "letter", abbrev: ".NET", bg: "#512BD4", fg: "#fff" },
  "node.js":          { kind: "letter", abbrev: "No",   bg: "#339933", fg: "#fff" },
  nodejs:             { kind: "letter", abbrev: "No",   bg: "#339933", fg: "#fff" },
  express:            { kind: "letter", abbrev: "Ex",   bg: "#000",    fg: "#fff" },
  spring:             { kind: "letter", abbrev: "Sp",   bg: "#6DB33F", fg: "#fff" },
  "spring boot":      { kind: "letter", abbrev: "SB",   bg: "#6DB33F", fg: "#fff" },
  django:             { kind: "letter", abbrev: "Dj",   bg: "#092E20", fg: "#fff" },
  laravel:            { kind: "letter", abbrev: "Lv",   bg: "#FF2D20", fg: "#fff" },
  fastapi:            { kind: "letter", abbrev: "FA",   bg: "#009688", fg: "#fff" },
  graphql:            { kind: "letter", abbrev: "GQ",   bg: "#E10098", fg: "#fff" },
  "rest api":         { kind: "lucide", Icon: Server,    color: "#6366F1" },
  api:                { kind: "lucide", Icon: Server,    color: "#6366F1" },

  // ── Databases ─────────────────────────────────────────────────────────────
  sql:            { kind: "lucide", Icon: Database,  color: "#2563EB" },
  mysql:          { kind: "letter", abbrev: "My",   bg: "#4479A1", fg: "#fff" },
  postgresql:     { kind: "letter", abbrev: "PG",   bg: "#336791", fg: "#fff" },
  postgres:       { kind: "letter", abbrev: "PG",   bg: "#336791", fg: "#fff" },
  mongodb:        { kind: "letter", abbrev: "MG",   bg: "#47A248", fg: "#fff" },
  redis:          { kind: "letter", abbrev: "Rd",   bg: "#DC382D", fg: "#fff" },
  sqlite:         { kind: "letter", abbrev: "SL",   bg: "#003B57", fg: "#fff" },

  // ── Dev tools / Cloud ─────────────────────────────────────────────────────
  git:            { kind: "letter", abbrev: "GIT",  bg: "#F05032", fg: "#fff" },
  github:         { kind: "letter", abbrev: "GH",   bg: "#181717", fg: "#fff" },
  gitlab:         { kind: "letter", abbrev: "GL",   bg: "#FC6D26", fg: "#fff" },
  docker:         { kind: "letter", abbrev: "Dk",   bg: "#2496ED", fg: "#fff" },
  kubernetes:     { kind: "letter", abbrev: "K8s",  bg: "#326CE5", fg: "#fff" },
  aws:            { kind: "letter", abbrev: "AWS",  bg: "#FF9900", fg: "#fff" },
  azure:          { kind: "letter", abbrev: "Az",   bg: "#0078D4", fg: "#fff" },
  gcp:            { kind: "letter", abbrev: "GCP",  bg: "#4285F4", fg: "#fff" },
  linux:          { kind: "letter", abbrev: "Lx",   bg: "#FCC624", fg: "#1a1a1a" },

  // ── Firebase ecosystem ────────────────────────────────────────────────────
  firebase:                { kind: "letter", abbrev: "FB",  bg: "#FFCA28", fg: "#3d2800" },
  "firebase realtime":     { kind: "letter", abbrev: "FB",  bg: "#FFCA28", fg: "#3d2800" },
  "firestore":             { kind: "letter", abbrev: "FS",  bg: "#FFCA28", fg: "#3d2800" },
  "firestore database":    { kind: "letter", abbrev: "FS",  bg: "#FFCA28", fg: "#3d2800" },
  "firestone database":    { kind: "letter", abbrev: "FS",  bg: "#FFCA28", fg: "#3d2800" },
  "fireauth":              { kind: "letter", abbrev: "FA",  bg: "#FFCA28", fg: "#3d2800" },
  "firebase auth":         { kind: "letter", abbrev: "FA",  bg: "#FFCA28", fg: "#3d2800" },

  // ── Auth / Security ───────────────────────────────────────────────────────
  jwt:            { kind: "lucide", Icon: Key,       color: "#D97706" },
  oauth:          { kind: "lucide", Icon: Shield,    color: "#6366F1" },
  auth0:          { kind: "letter", abbrev: "A0",   bg: "#EB5424", fg: "#fff" },

  // ── Unity / Game Dev ─────────────────────────────────────────────────────
  "unity engine":       { kind: "letter", abbrev: "U",    bg: "#222", fg: "#fff" },
  unity:                { kind: "letter", abbrev: "U",    bg: "#222", fg: "#fff" },
  "scriptableobject":   { kind: "letter", abbrev: "SO",   bg: "#333", fg: "#aaa" },
  "ui system (canvas)": { kind: "letter", abbrev: "UI",   bg: "#333", fg: "#aaa" },
  "particle system":    { kind: "lucide", Icon: Sparkles, color: "#8B5CF6" },
  "navmeshagent":       { kind: "lucide", Icon: Navigation, color: "#059669" },
  cinemachine:          { kind: "lucide", Icon: Video,    color: "#2563EB" },
  animation:            { kind: "lucide", Icon: Play,     color: "#EC4899" },
  "unreal engine":      { kind: "letter", abbrev: "UE",   bg: "#1a1a1a", fg: "#fff" },

  // ── Architecture / Concepts ───────────────────────────────────────────────
  oop:                        { kind: "lucide", Icon: Boxes,     color: "#7C3AED" },
  "object-oriented":          { kind: "lucide", Icon: Boxes,     color: "#7C3AED" },
  "object pooling":           { kind: "lucide", Icon: Layers,    color: "#6366F1" },
  "design patterns":          { kind: "lucide", Icon: Layers,    color: "#8B5CF6" },
  "clean code":               { kind: "lucide", Icon: CheckCheck,color: "#059669" },
  "performance optimization": { kind: "lucide", Icon: Zap,       color: "#D97706" },
  "state machine":            { kind: "lucide", Icon: GitBranch, color: "#4F46E5" },
  microservices:              { kind: "lucide", Icon: Network,    color: "#0EA5E9" },
  "solid principles":         { kind: "lucide", Icon: Layers,    color: "#8B5CF6" },
  solid:                      { kind: "lucide", Icon: Layers,    color: "#8B5CF6" },

  // ── Data / ML ─────────────────────────────────────────────────────────────
  "machine learning":  { kind: "letter", abbrev: "ML",  bg: "#FF6F00", fg: "#fff" },
  tensorflow:          { kind: "letter", abbrev: "TF",  bg: "#FF6F00", fg: "#fff" },
  pytorch:             { kind: "letter", abbrev: "PT",  bg: "#EE4C2C", fg: "#fff" },
};

// ── Fallback colours (deterministic, based on first char of skill name) ───────
const FALLBACK_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
  "#F97316", "#EAB308", "#22C55E", "#14B8A6",
  "#3B82F6", "#0EA5E9",
];

function getSkillVisual(skill: string): SkillVisual {
  const key = skill.toLowerCase().trim();

  // 1. Exact match
  if (SKILL_MAP[key]) return SKILL_MAP[key];

  // 2. "Starts with" match (e.g. "asp.net core web api" hits "asp.net")
  for (const [mapKey, visual] of Object.entries(SKILL_MAP)) {
    if (mapKey.length >= 3 && key.startsWith(mapKey)) return visual;
  }

  // 3. Fallback: derive abbreviation + deterministic colour
  const words = skill.trim().split(/[\s_-]+/);
  const abbrev =
    words.length > 1
      ? words
          .slice(0, 2)
          .map((w) => w[0] ?? "")
          .join("")
          .toUpperCase()
      : skill.slice(0, 2).toUpperCase();

  const colorIdx = (skill.charCodeAt(0) ?? 0) % FALLBACK_COLORS.length;
  return { kind: "letter", abbrev, bg: FALLBACK_COLORS[colorIdx], fg: "#fff" };
}

// ── SkillBadge component ──────────────────────────────────────────────────────

interface SkillBadgeProps {
  skill: string;
  /** Show remove (×) button */
  editing?: boolean;
  onRemove?: () => void;
}

export function SkillBadge({ skill, editing, onRemove }: SkillBadgeProps) {
  // ① Brand / concept icon from skill-icons.tsx (react-icons/si + lucide)
  const skillIcon = getSkillIcon(skill);
  const SIcon = skillIcon?.icon;

  // ② Only compute letter/lucide fallback when no brand icon matched
  const visual = SIcon ? null : getSkillVisual(skill);

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[12px] font-[500] px-3 py-1.5 rounded-[6px]",
        portalMutedBg,
        portalHeadingAlt
      )}
    >
      {/* Brand icon (SiTypescript, SiFirebase, SiUnity, etc.) */}
      {SIcon && (
        <SIcon
          aria-hidden
          size={13}
          className={cn("shrink-0", skillIcon!.className)}
        />
      )}

      {/* Letter badge fallback */}
      {!SIcon && visual && visual.kind === "letter" && (
        <span
          aria-hidden
          className="inline-flex items-center justify-center rounded-[3px] text-[8px] font-bold leading-none shrink-0"
          style={{
            background: visual.bg,
            color: visual.fg,
            minWidth: "1.125rem",
            height: "1.125rem",
            padding: "0 2px",
          }}
        >
          {visual.abbrev}
        </span>
      )}

      {/* Lucide icon fallback */}
      {!SIcon && visual && visual.kind === "lucide" && (
        <visual.Icon
          aria-hidden
          size={13}
          className="shrink-0"
          style={{ color: visual.color }}
        />
      )}

      {skill}

      {editing && (
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors ml-0.5"
          aria-label={`Remove ${skill}`}
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}
