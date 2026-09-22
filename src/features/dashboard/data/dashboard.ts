import {
  LayoutDashboard,
  Wand2,
  History,
  Settings,
  BookOpen,
  Users,
} from "lucide-react";
import type { NavItem } from "@/features/dashboard/types/dashboard";

/** Nav items cho HR sidebar — không còn mock stats/sessions. */
export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/hr/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Generate Questions",
    href: "/hr/generate-question",
    icon: Wand2,
  },
  {
    label: "Question Sets",
    href: "/hr/history",
    icon: History,
  },
  {
    label: "Knowledge Base",
    href: "/hr/knowledge",
    icon: BookOpen,
  },
  {
    label: "Candidates",
    href: "/hr/candidate-recommendations",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/hr/settings",
    icon: Settings,
  },
];
