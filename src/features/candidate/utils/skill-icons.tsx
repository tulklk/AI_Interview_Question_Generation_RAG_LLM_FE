/**
 * Maps common technology skill names to their logo icons.
 * Uses react-icons/si (Simple Icons) for brand icons,
 * and lucide-react for generic concept icons.
 *
 * getSkillIcon(skillName) → { icon, className } | null
 */

import type { ComponentType } from "react";
import {
  Code2, Globe, Network, Server, Database,
  Workflow, GitMerge, RotateCcw, Cloud, Coffee,
  Users, MessageCircle, BarChart2, Zap, Layers,
  FileCode, Monitor, Play, GitBranch, Camera, Key, Sparkles, Navigation,
} from "lucide-react";
import {
  SiDotnet,
  SiPostgresql,
  SiDocker,
  SiGit, SiGithub, SiGitlab,
  SiKubernetes,
  SiRedis, SiMongodb, SiMysql,
  SiPython, SiDjango, SiFlask,
  SiNodedotjs,
  SiReact, SiVuedotjs, SiAngular, SiNextdotjs,
  SiTypescript, SiJavascript,
  SiPhp, SiLaravel,
  SiSpring, SiSpringboot,
  SiKotlin, SiSwift,
  SiGo, SiRust, SiCplusplus,
  SiJenkins,
  SiGraphql,
  SiTailwindcss,
  SiLinux, SiNginx, SiUbuntu,
  SiScrumalliance,
  SiUnity,
  SiFirebase,
  SiJsonwebtokens,
} from "react-icons/si";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconComponent = ComponentType<{ size?: number; className?: string; [k: string]: any }>;

export interface SkillIconConfig {
  icon: IconComponent;
  /** Tailwind color class(es) for the icon */
  className: string;
}

/**
 * Ordered list: first matching entry wins.
 * Patterns are tested case-insensitively against the raw skill string.
 */
const SKILL_RULES: Array<{ test: RegExp; config: SkillIconConfig }> = [
  // ── Microsoft / .NET ──────────────────────────────────────────────
  // C# must come before generic "c" patterns
  { test: /c#|csharp/i,           config: { icon: SiDotnet,     className: "text-[#9B4F96]" } },
  { test: /asp\.net/i,            config: { icon: SiDotnet,     className: "text-[#512BD4]" } },
  { test: /\.net|dotnet/i,        config: { icon: SiDotnet,     className: "text-[#512BD4]" } },

  // ── Databases ─────────────────────────────────────────────────────
  { test: /postgresql|postgres/i, config: { icon: SiPostgresql, className: "text-[#4169E1]" } },
  { test: /sql.?server|mssql/i,   config: { icon: Database,     className: "text-[#CC2927]" } },
  { test: /mysql/i,               config: { icon: SiMysql,      className: "text-[#4479A1]" } },
  { test: /mongodb|mongo\b/i,     config: { icon: SiMongodb,    className: "text-[#47A248]" } },
  { test: /redis/i,               config: { icon: SiRedis,      className: "text-[#DC382D]" } },
  { test: /\bsql\b/i,             config: { icon: Database,     className: "text-gray-500 dark:text-gray-400" } },

  // ── Containers / DevOps ───────────────────────────────────────────
  { test: /docker/i,              config: { icon: SiDocker,       className: "text-[#2496ED]" } },
  { test: /kubernetes|k8s/i,      config: { icon: SiKubernetes,   className: "text-[#326CE5]" } },
  { test: /jenkins/i,             config: { icon: SiJenkins,      className: "text-[#D24939]" } },
  { test: /ci.?cd|pipeline/i,     config: { icon: Workflow,        className: "text-gray-500 dark:text-gray-400" } },
  { test: /devops/i,              config: { icon: GitMerge,        className: "text-gray-500 dark:text-gray-400" } },
  { test: /nginx/i,               config: { icon: SiNginx,         className: "text-[#009639]" } },

  // ── Cloud ─────────────────────────────────────────────────────────
  { test: /aws|amazon.web/i,      config: { icon: Cloud,           className: "text-[#FF9900]" } },
  { test: /azure/i,               config: { icon: Cloud,           className: "text-[#0078D4]" } },
  { test: /gcp|google.cloud/i,    config: { icon: Cloud,           className: "text-[#4285F4]" } },
  { test: /heroku/i,              config: { icon: Cloud,           className: "text-[#430098]" } },

  // ── Version control ───────────────────────────────────────────────
  { test: /github/i,              config: { icon: SiGithub,        className: "text-gray-700 dark:text-gray-200" } },
  { test: /gitlab/i,              config: { icon: SiGitlab,        className: "text-[#FC6D26]" } },
  { test: /\bgit\b/i,             config: { icon: SiGit,           className: "text-[#F05032]" } },

  // ── Frontend frameworks ───────────────────────────────────────────
  { test: /next\.?js|nextjs/i,    config: { icon: SiNextdotjs,     className: "text-gray-700 dark:text-gray-200" } },
  { test: /react/i,               config: { icon: SiReact,         className: "text-[#61DAFB]" } },
  { test: /vue/i,                 config: { icon: SiVuedotjs,      className: "text-[#4FC08D]" } },
  { test: /angular/i,             config: { icon: SiAngular,       className: "text-[#DD0031]" } },
  { test: /tailwind/i,            config: { icon: SiTailwindcss,   className: "text-[#06B6D4]" } },

  // ── Languages ─────────────────────────────────────────────────────
  { test: /typescript|\.ts\b/i,   config: { icon: SiTypescript,    className: "text-[#3178C6]" } },
  { test: /javascript|\.js\b/i,   config: { icon: SiJavascript,    className: "text-[#F7DF1E]" } },
  { test: /c\+\+|cpp/i,           config: { icon: SiCplusplus,     className: "text-[#00599C]" } },
  // Java — no SI icon in this version; use Coffee (the language mascot is ☕)
  { test: /\bjava\b/i,            config: { icon: Coffee,          className: "text-[#ED8B00]" } },
  { test: /kotlin/i,              config: { icon: SiKotlin,        className: "text-[#7F52FF]" } },
  { test: /swift/i,               config: { icon: SiSwift,         className: "text-[#FA7343]" } },
  { test: /python/i,              config: { icon: SiPython,        className: "text-[#3776AB]" } },
  { test: /\bgo\b|golang/i,       config: { icon: SiGo,            className: "text-[#00ADD8]" } },
  { test: /rust/i,                config: { icon: SiRust,          className: "text-gray-700 dark:text-gray-300" } },
  { test: /\bphp\b/i,             config: { icon: SiPhp,           className: "text-[#777BB4]" } },

  // ── Backend frameworks ────────────────────────────────────────────
  { test: /spring.?boot/i,        config: { icon: SiSpringboot,    className: "text-[#6DB33F]" } },
  { test: /spring/i,              config: { icon: SiSpring,        className: "text-[#6DB33F]" } },
  { test: /laravel/i,             config: { icon: SiLaravel,       className: "text-[#FF2D20]" } },
  { test: /django/i,              config: { icon: SiDjango,        className: "text-[#092E20] dark:text-[#44B78B]" } },
  { test: /flask/i,               config: { icon: SiFlask,         className: "text-gray-700 dark:text-gray-200" } },
  { test: /node\.?js|nodejs/i,    config: { icon: SiNodedotjs,     className: "text-[#339933]" } },
  { test: /graphql/i,             config: { icon: SiGraphql,       className: "text-[#E10098]" } },

  // ── Game development / Unity ─────────────────────────────────────
  { test: /unity/i,                       config: { icon: SiUnity,         className: "text-gray-800 dark:text-white" } },
  { test: /scriptable.?object/i,          config: { icon: FileCode,        className: "text-gray-500 dark:text-gray-400" } },
  { test: /object.pool/i,                 config: { icon: Layers,          className: "text-gray-500 dark:text-gray-400" } },
  { test: /ui.system|ui.canvas|canvas\b/i, config: { icon: Monitor,        className: "text-gray-500 dark:text-gray-400" } },
  { test: /animat/i,                      config: { icon: Play,            className: "text-gray-500 dark:text-gray-400" } },
  { test: /particle/i,                    config: { icon: Sparkles,        className: "text-amber-500 dark:text-amber-400" } },
  { test: /state.machine/i,               config: { icon: GitBranch,       className: "text-gray-500 dark:text-gray-400" } },
  { test: /navmesh|nav.mesh/i,            config: { icon: Navigation,      className: "text-gray-500 dark:text-gray-400" } },
  { test: /cinemachine/i,                 config: { icon: Camera,          className: "text-gray-500 dark:text-gray-400" } },

  // ── Firebase / Google cloud services ─────────────────────────────
  { test: /firebase|firestore|firestone|fireauth/i, config: { icon: SiFirebase, className: "text-[#FFCA28]" } },

  // ── OS / Infrastructure ───────────────────────────────────────────
  { test: /ubuntu/i,              config: { icon: SiUbuntu,        className: "text-[#E95420]" } },
  { test: /linux/i,               config: { icon: SiLinux,         className: "text-gray-700 dark:text-gray-200" } },
  { test: /server|backend/i,      config: { icon: Server,          className: "text-gray-500 dark:text-gray-400" } },

  // ── Architecture / methodology ────────────────────────────────────
  { test: /microservice/i,        config: { icon: Network,         className: "text-gray-500 dark:text-gray-400" } },
  { test: /scrum|agile|kanban/i,  config: { icon: SiScrumalliance, className: "text-[#009FDA]" } },
  { test: /rest.?api|api\b/i,     config: { icon: Globe,           className: "text-gray-500 dark:text-gray-400" } },
  { test: /system.design/i,       config: { icon: Network,         className: "text-gray-500 dark:text-gray-400" } },
  { test: /message.queue|rabbitmq|kafka/i, config: { icon: Server, className: "text-gray-500 dark:text-gray-400" } },
  { test: /clean.arch|ddd|cqrs/i, config: { icon: Network,         className: "text-gray-500 dark:text-gray-400" } },
  { test: /unit.test|testing|tdd/i, config: { icon: Code2,         className: "text-emerald-600 dark:text-emerald-400" } },
  { test: /oop|object.orient/i,      config: { icon: Code2,         className: "text-blue-500 dark:text-blue-400" } },
  { test: /design.pattern/i,         config: { icon: Layers,        className: "text-indigo-500 dark:text-indigo-400" } },
  { test: /data.model/i,             config: { icon: Database,      className: "text-gray-500 dark:text-gray-400" } },
  { test: /analytic|analysis/i,      config: { icon: BarChart2,     className: "text-gray-500 dark:text-gray-400" } },
  { test: /estimat/i,                config: { icon: BarChart2,     className: "text-gray-500 dark:text-gray-400" } },
  { test: /architect/i,              config: { icon: Network,       className: "text-gray-500 dark:text-gray-400" } },

  // ── Soft skills / communication ───────────────────────────────────────────
  { test: /english|communicat/i,     config: { icon: MessageCircle, className: "text-gray-500 dark:text-gray-400" } },
  { test: /mentor|coach/i,           config: { icon: Users,         className: "text-gray-500 dark:text-gray-400" } },
  { test: /leadership|lead\b/i,      config: { icon: Users,         className: "text-gray-500 dark:text-gray-400" } },
  { test: /teamwork|team.player|collabor/i, config: { icon: Users,  className: "text-gray-500 dark:text-gray-400" } },
  { test: /proactive|pro.active|attitude/i, config: { icon: Zap,   className: "text-amber-500 dark:text-amber-400" } },
  { test: /problem.solv/i,           config: { icon: Code2,         className: "text-emerald-600 dark:text-emerald-400" } },
  { test: /critical.think/i,         config: { icon: Zap,           className: "text-amber-500 dark:text-amber-400" } },
  { test: /presentation|public.speak/i, config: { icon: MessageCircle, className: "text-gray-500 dark:text-gray-400" } },
  { test: /time.manage/i,            config: { icon: BarChart2,     className: "text-gray-500 dark:text-gray-400" } },

  // ── Security / Auth tokens ────────────────────────────────────────
  { test: /jwt|json.web.token/i,     config: { icon: SiJsonwebtokens, className: "text-purple-600 dark:text-purple-400" } },
  { test: /oauth/i,                  config: { icon: Key,             className: "text-gray-500 dark:text-gray-400" } },

  // ── Code quality / Optimization ──────────────────────────────────
  { test: /clean.code/i,             config: { icon: Code2,         className: "text-emerald-600 dark:text-emerald-400" } },
  { test: /performance.optim|optim/i, config: { icon: Zap,          className: "text-amber-500 dark:text-amber-400" } },
];

/**
 * Returns the icon config for a given skill name, or null if none matched.
 */
export function getSkillIcon(skill: string): SkillIconConfig | null {
  for (const { test, config } of SKILL_RULES) {
    if (test.test(skill)) return config;
  }
  return null;
}
