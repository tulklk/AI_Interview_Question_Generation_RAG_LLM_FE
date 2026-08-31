// ─────────────────────────────────────────────────────────────────────────────
// Dummy data for Candidate Roadmap page.
// Replace with real API calls when backend is ready.
// ─────────────────────────────────────────────────────────────────────────────

export type PhaseStatus = "completed" | "in-progress" | "upcoming" | "locked";

export interface PhaseTask {
  id: string;
  label: string;
  done: boolean;
}

export interface Phase {
  id: string;
  title: string;
  weekLabel: string;
  status: PhaseStatus;
  progress: number; // 0-100
  tasks: PhaseTask[];
  ctaLabel: string;
}

export interface SkillGap {
  id: string;
  name: string;
  current: number;
  target: number;
  priority: "high" | "medium" | "low";
}

export interface WeekDay {
  dayLabel: string;
  topic: string;
  durationMinutes: number;
  status: "completed" | "current" | "upcoming";
}

export interface PracticeRec {
  id: string;
  title: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  durationMinutes: number;
}

export interface Milestone {
  id: string;
  label: string;
  done: boolean;
}

// ── Roadmap summary ────────────────────────────────────────────────────────────

export const ROADMAP_SUMMARY = {
  targetRole: "Full-stack Developer",
  currentLevel: "Junior",
  targetLevel: "Middle",
  readiness: 46,
  targetReadiness: 80,
  totalProgress: 38,
  estimatedWeeks: 6,
  sessions: 53,
  streak: 1,
  remainingTasks: 18,
  averageScore: 60.3,
  candidateName: "Thành Tú",
} as const;

// ── Phases ─────────────────────────────────────────────────────────────────────

export const PHASES: Phase[] = [
  {
    id: "phase-1",
    title: "Nền tảng kỹ thuật",
    weekLabel: "Tuần 1",
    status: "completed",
    progress: 100,
    tasks: [
      { id: "t1-1", label: "Ôn C# Value Type / Reference Type", done: true },
      { id: "t1-2", label: "OOP & SOLID Principles", done: true },
      { id: "t1-3", label: "Collections & LINQ", done: true },
      { id: "t1-4", label: "Dependency Injection", done: true },
      { id: "t1-5", label: "Async / Await", done: true },
    ],
    ctaLabel: "Xem lại",
  },
  {
    id: "phase-2",
    title: "Backend & REST API",
    weekLabel: "Tuần 2",
    status: "in-progress",
    progress: 65,
    tasks: [
      { id: "t2-1", label: "REST API fundamentals", done: true },
      { id: "t2-2", label: "DTO & Service Layer", done: true },
      { id: "t2-3", label: "JWT Authentication", done: true },
      { id: "t2-4", label: "Authorization & Role", done: false },
      { id: "t2-5", label: "Exception Handling", done: false },
      { id: "t2-6", label: "Logging", done: false },
    ],
    ctaLabel: "Tiếp tục",
  },
  {
    id: "phase-3",
    title: "Database & Data Access",
    weekLabel: "Tuần 3",
    status: "upcoming",
    progress: 20,
    tasks: [
      { id: "t3-1", label: "SQL Query cơ bản & nâng cao", done: false },
      { id: "t3-2", label: "Indexing & Query Optimization", done: false },
      { id: "t3-3", label: "PostgreSQL", done: false },
      { id: "t3-4", label: "Entity Framework Core", done: false },
      { id: "t3-5", label: "Migrations & Transactions", done: false },
    ],
    ctaLabel: "Xem nội dung",
  },
  {
    id: "phase-4",
    title: "Frontend Integration",
    weekLabel: "Tuần 4",
    status: "upcoming",
    progress: 0,
    tasks: [
      { id: "t4-1", label: "React State Management", done: false },
      { id: "t4-2", label: "REST API integration", done: false },
      { id: "t4-3", label: "Authentication flow", done: false },
      { id: "t4-4", label: "Error handling & UX", done: false },
      { id: "t4-5", label: "Performance optimization", done: false },
    ],
    ctaLabel: "Xem nội dung",
  },
  {
    id: "phase-5",
    title: "System Design & Deployment",
    weekLabel: "Tuần 5",
    status: "locked",
    progress: 0,
    tasks: [
      { id: "t5-1", label: "System Design fundamentals", done: false },
      { id: "t5-2", label: "Docker & Containerization", done: false },
      { id: "t5-3", label: "CI/CD Pipeline", done: false },
      { id: "t5-4", label: "Caching & Security", done: false },
      { id: "t5-5", label: "Scalability patterns", done: false },
    ],
    ctaLabel: "Xem nội dung",
  },
  {
    id: "phase-6",
    title: "Mock Interview",
    weekLabel: "Tuần 6",
    status: "locked",
    progress: 0,
    tasks: [
      { id: "t6-1", label: "Technical Mock Interview", done: false },
      { id: "t6-2", label: "System Design Interview", done: false },
      { id: "t6-3", label: "Behavioral Interview", done: false },
      { id: "t6-4", label: "Final Assessment", done: false },
    ],
    ctaLabel: "Bắt đầu",
  },
];

// ── Skills ─────────────────────────────────────────────────────────────────────

export const SKILLS: SkillGap[] = [
  { id: "sk-1", name: "System Design", current: 45, target: 75, priority: "high" },
  { id: "sk-2", name: "Docker", current: 42, target: 70, priority: "high" },
  { id: "sk-3", name: "Problem Solving", current: 55, target: 75, priority: "high" },
  { id: "sk-4", name: "ASP.NET Core", current: 65, target: 85, priority: "medium" },
  { id: "sk-5", name: "React", current: 62, target: 80, priority: "medium" },
  { id: "sk-6", name: "REST API", current: 70, target: 85, priority: "medium" },
  { id: "sk-7", name: "SQL", current: 68, target: 80, priority: "medium" },
  { id: "sk-8", name: "C# / .NET", current: 72, target: 85, priority: "low" },
];

// ── Weekly plan ────────────────────────────────────────────────────────────────

export const WEEKLY_PLAN: WeekDay[] = [
  { dayLabel: "T2", topic: "REST API", durationMinutes: 30, status: "completed" },
  { dayLabel: "T3", topic: "JWT Authentication", durationMinutes: 25, status: "completed" },
  { dayLabel: "T4", topic: "Authorization", durationMinutes: 30, status: "current" },
  { dayLabel: "T5", topic: "SQL Optimization", durationMinutes: 35, status: "upcoming" },
  { dayLabel: "T6", topic: "System Design", durationMinutes: 45, status: "upcoming" },
  { dayLabel: "T7", topic: "Mock Interview", durationMinutes: 60, status: "upcoming" },
  { dayLabel: "CN", topic: "Review", durationMinutes: 20, status: "upcoming" },
];

// ── Practice recommendations ───────────────────────────────────────────────────

export const RECOMMENDED_PRACTICES: PracticeRec[] = [
  {
    id: "pr-1",
    title: "ASP.NET Core Authentication",
    category: "Technical",
    difficulty: "Medium",
    durationMinutes: 20,
  },
  {
    id: "pr-2",
    title: "Debug REST API 500 Error",
    category: "Problem Solving",
    difficulty: "Medium",
    durationMinutes: 15,
  },
  {
    id: "pr-3",
    title: "Design URL Shortener",
    category: "System Design",
    difficulty: "Hard",
    durationMinutes: 30,
  },
];

// ── Milestones ─────────────────────────────────────────────────────────────────

export const MILESTONES: Milestone[] = [
  { id: "m-1", label: "Đạt Readiness 40", done: true },
  { id: "m-2", label: "Hoàn thành 25 phiên luyện tập", done: true },
  { id: "m-3", label: "Technical score > 60%", done: true },
  { id: "m-4", label: "Đạt Readiness 60", done: false },
  { id: "m-5", label: "System Design score > 70%", done: false },
  { id: "m-6", label: "Đạt Readiness 80", done: false },
  { id: "m-7", label: "Hoàn thành Mock Interview", done: false },
];

// ── Next action ────────────────────────────────────────────────────────────────

export const NEXT_ACTION = {
  title: "System Design Fundamentals",
  description:
    "Mục tiêu hôm nay: hiểu cách phân tách service, database và caching trong một hệ thống web.",
  estimatedMinutes: 25,
  difficulty: "Medium" as const,
  completedSteps: 0,
  totalSteps: 3,
  phase: "Phase 5",
};

// ── AI Coach insight ───────────────────────────────────────────────────────────

export const COACH_INSIGHT = {
  body: "Bạn đang có nền tảng Backend khá tốt nhưng System Design và Docker đang là hai khoảng cách lớn nhất so với vị trí Full-stack Developer. Trong 7 ngày tới, hãy ưu tiên các bài luyện System Design và Deployment.",
};
