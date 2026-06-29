import { Server, Globe, Workflow, Network } from "lucide-react";
import { SiReact, SiTypescript, SiNextdotjs, SiGraphql } from "react-icons/si";

export const KEYWORD_ICONS: Record<string, { icon: typeof SiReact; className: string }> = {
  React: { icon: SiReact, className: "text-[#61DAFB]" },
  TypeScript: { icon: SiTypescript, className: "text-[#3178C6]" },
  "Next.js": { icon: SiNextdotjs, className: "text-gray-700 dark:text-gray-200" },
  SSR: { icon: Server, className: "text-gray-500 dark:text-gray-400" },
  "REST API": { icon: Globe, className: "text-gray-500 dark:text-gray-400" },
  GraphQL: { icon: SiGraphql, className: "text-[#E10098]" },
  "CI/CD": { icon: Workflow, className: "text-gray-500 dark:text-gray-400" },
  "System Design": { icon: Network, className: "text-gray-500 dark:text-gray-400" },
};
