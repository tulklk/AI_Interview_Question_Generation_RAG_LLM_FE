import {
  LayoutDashboard,
  BookOpen,
  Briefcase,
  History,
  Settings,
  Bookmark,
  Mail,
  Sparkles,
} from "lucide-react";
import type { JobseekerNavItem } from "@/features/candidate/types/jobseeker";

export const jobseekerNavItems: JobseekerNavItem[] = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: BookOpen },
  { label: "Jobs", href: "/candidate/jobs", icon: Briefcase },
  { label: "AI Coach", href: "/candidate/coach", icon: Sparkles },
  { label: "Saved", href: "/candidate/saved", icon: Bookmark },
  { label: "Invitations", href: "/candidate/invitations", icon: Mail },
  { label: "History", href: "/candidate/history", icon: History },
  { label: "Settings", href: "/candidate/settings", icon: Settings },
];
