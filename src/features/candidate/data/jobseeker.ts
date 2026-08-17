import {
  LayoutDashboard,
  BookOpen,
  History,
  Settings,
  Bookmark,
  Mail,
  Sparkles,
} from "lucide-react";
import type { JobseekerNavItem } from "@/features/candidate/types/jobseeker";

export const jobseekerNavItems: JobseekerNavItem[] = [
  { label: "Dashboard", href: "/jobseeker/dashboard", icon: LayoutDashboard },
  { label: "Practice Now", href: "/jobseeker/practice", icon: BookOpen },
  { label: "AI Coach", href: "/jobseeker/coach", icon: Sparkles },
  { label: "Saved", href: "/jobseeker/saved", icon: Bookmark },
  { label: "Invitations", href: "/jobseeker/invitations", icon: Mail },
  { label: "History", href: "/jobseeker/history", icon: History },
  { label: "Settings", href: "/jobseeker/settings", icon: Settings },
];
