import {
  FileText,
  Zap,
  TrendingUp,
  BarChart3,
  LayoutDashboard,
  Sparkles,
  History,
  Settings,
  BookOpen,
} from "lucide-react";
import type {
  StatItem,
  WeeklyDataPoint,
  CategoryStat,
  RecentSession,
  NavItem,
} from "@/features/dashboard/types/dashboard";

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/hr/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Generate Questions",
    href: "/hr/generate",
    icon: Sparkles,
    badge: "New",
    badgeVariant: "new",
  },
  {
    label: "History",
    href: "/hr/history",
    icon: History,
    badge: 7,
    badgeVariant: "count",
  },
  {
    label: "Knowledge Base",
    href: "/hr/knowledge",
    icon: BookOpen,
  },
  {
    label: "Settings",
    href: "/hr/settings",
    icon: Settings,
  },
];

export const stats: StatItem[] = [
  {
    id: "jds-processed",
    label: "Total JDs Processed",
    value: "24",
    trend: "+12%",
    trendPositive: true,
    icon: FileText,
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "questions-generated",
    label: "Questions Generated",
    value: "186",
    trend: "+28%",
    trendPositive: true,
    icon: Zap,
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
    iconColor: "text-violet-500 dark:text-violet-400",
  },
  {
    id: "this-week",
    label: "This Week",
    value: "12",
    trend: "+4",
    trendPositive: true,
    icon: TrendingUp,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-500 dark:text-emerald-400",
  },
  {
    id: "avg-questions",
    label: "Avg Questions / JD",
    value: "7.75",
    trend: "+0.5",
    trendPositive: true,
    icon: BarChart3,
    iconBg: "bg-orange-50 dark:bg-orange-950/40",
    iconColor: "text-orange-500 dark:text-orange-400",
  },
];

export const weeklyActivity: WeeklyDataPoint[] = [
  { day: "Mon", questions: 20, jds: 5 },
  { day: "Tue", questions: 25, jds: 8 },
  { day: "Wed", questions: 22, jds: 6 },
  { day: "Thu", questions: 38, jds: 9 },
  { day: "Fri", questions: 45, jds: 12 },
  { day: "Sat", questions: 30, jds: 8 },
  { day: "Sun", questions: 25, jds: 7 },
];

export const categoryStats: CategoryStat[] = [
  { name: "Technical", count: 68, color: "#6c47ff" },
  { name: "Behavioral", count: 42, color: "#6c47ff" },
  { name: "Situational", count: 35, color: "#6c47ff" },
  { name: "Cultural", count: 18, color: "#6c47ff" },
];

export const recentSessions: RecentSession[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    role: "Frontend",
    roleColor: "text-blue-600 dark:text-blue-400",
    roleBg: "bg-blue-50 dark:bg-blue-950/40",
    questionsCount: 15,
    relativeTime: "3 hours ago",
  },
  {
    id: "2",
    title: "Product Manager",
    role: "Product",
    roleColor: "text-purple-600 dark:text-purple-400",
    roleBg: "bg-purple-50 dark:bg-purple-950/40",
    questionsCount: 12,
    relativeTime: "1 day ago",
  },
  {
    id: "3",
    title: "Data Scientist",
    role: "Data",
    roleColor: "text-amber-600 dark:text-amber-400",
    roleBg: "bg-amber-50 dark:bg-amber-950/40",
    questionsCount: 18,
    relativeTime: "2 days ago",
  },
  {
    id: "4",
    title: "Backend Developer",
    role: "Backend",
    roleColor: "text-emerald-600 dark:text-emerald-400",
    roleBg: "bg-emerald-50 dark:bg-emerald-950/40",
    questionsCount: 14,
    relativeTime: "3 days ago",
  },
];
