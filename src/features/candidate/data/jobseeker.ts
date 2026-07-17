import {
  LayoutDashboard,
  BookOpen,
  History,
  Settings,
  Bookmark,
} from "lucide-react";
import type { JobseekerNavItem } from "@/features/candidate/types/jobseeker";

// ── Navigation ─────────────────────────────────────────────────────────────
export const jobseekerNavItems: JobseekerNavItem[] = [
  { label: "Dashboard", href: "/jobseeker/dashboard", icon: LayoutDashboard },
  { label: "Practice Now", href: "/jobseeker/practice", icon: BookOpen },
  { label: "Saved", href: "/jobseeker/saved", icon: Bookmark },
  { label: "History", href: "/jobseeker/history", icon: History },
  { label: "Settings", href: "/jobseeker/settings", icon: Settings },
];
