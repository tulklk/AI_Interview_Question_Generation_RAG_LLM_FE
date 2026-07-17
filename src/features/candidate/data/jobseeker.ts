import {
  LayoutDashboard,
  BookOpen,
  History,
  Settings,
  Target,
  Brain,
  Trophy,
  TrendingUp,
  Bookmark,
} from "lucide-react";
import type {
  JobseekerNavItem,
  QuestionSet,
  PracticeSession,
  CandidateStat,
  Achievement,
} from "@/features/candidate/types/jobseeker";

// ── Navigation ─────────────────────────────────────────────────────────────
export const jobseekerNavItems: JobseekerNavItem[] = [
  { label: "Dashboard", href: "/jobseeker/dashboard", icon: LayoutDashboard },
  { label: "Practice Now", href: "/jobseeker/practice", icon: BookOpen },
  { label: "Saved", href: "/jobseeker/saved", icon: Bookmark },
  { label: "History", href: "/jobseeker/history", icon: History },
  { label: "Settings", href: "/jobseeker/settings", icon: Settings },
];

// ── Question Sets ──────────────────────────────────────────────────────────
export const questionSets: QuestionSet[] = [
  {
    id: "qs-1",
    title: "Senior Frontend Developer Interview",
    company: "Meta",
    companyInitials: "M",
    companyColor: "bg-blue-500",
    difficulty: "Hard",
    skills: ["React", "TypeScript", "Next.js", "Performance"],
    totalQuestions: 15,
    estimatedTime: "45 min",
    category: "Frontend",
    description:
      "Comprehensive frontend interview covering React internals, TypeScript advanced patterns, SSR/SSG, and system design for large-scale apps.",
    rating: 4.8,
    attempts: 1240,
    questions: [
      { id: "q1", text: "Explain React's reconciliation algorithm and how the virtual DOM works.", category: "Technical", difficulty: "Hard" },
      { id: "q2", text: "How would you optimize a React app with thousands of list items?", category: "Technical", difficulty: "Medium" },
      { id: "q3", text: "Describe the difference between SSR and SSG in Next.js and when you'd choose each.", category: "Technical", difficulty: "Medium" },
      { id: "q4", text: "Tell me about a time you resolved a critical production bug under pressure.", category: "Behavioral", difficulty: "Medium" },
      { id: "q5", text: "Describe a situation where you had to push back on a product requirement.", category: "Behavioral", difficulty: "Medium" },
      { id: "q6", text: "You discover a core dependency has a security vulnerability mid-sprint. What do you do?", category: "Situational", difficulty: "Hard" },
    ],
  },
  {
    id: "qs-2",
    title: "Full Stack Engineer — Node + React",
    company: "Stripe",
    companyInitials: "S",
    companyColor: "bg-violet-500",
    difficulty: "Medium",
    skills: ["Node.js", "React", "PostgreSQL", "REST API", "Docker"],
    totalQuestions: 12,
    estimatedTime: "35 min",
    category: "Full Stack",
    description:
      "End-to-end full stack interview covering both frontend (React) and backend (Node.js, PostgreSQL) with a focus on API design and data modeling.",
    rating: 4.6,
    attempts: 890,
    questions: [
      { id: "q1", text: "Design a REST API for a payment processing system. What endpoints and data models would you create?", category: "Technical", difficulty: "Hard" },
      { id: "q2", text: "How do you handle database migrations in a production environment with zero downtime?", category: "Technical", difficulty: "Medium" },
      { id: "q3", text: "Explain the event loop in Node.js and how it handles asynchronous operations.", category: "Technical", difficulty: "Medium" },
      { id: "q4", text: "Describe a time you had to deliver a complex feature with a tight deadline.", category: "Behavioral", difficulty: "Medium" },
    ],
  },
  {
    id: "qs-3",
    title: "Product Manager Interview Prep",
    company: "Google",
    companyInitials: "G",
    companyColor: "bg-emerald-500",
    difficulty: "Medium",
    skills: ["Product Strategy", "Data Analysis", "User Research", "Roadmap"],
    totalQuestions: 10,
    estimatedTime: "30 min",
    category: "Product",
    description:
      "PM interview covering product design, metrics, prioritization frameworks, and cross-functional collaboration scenarios.",
    rating: 4.7,
    attempts: 2100,
    questions: [
      { id: "q1", text: "How would you improve Google Maps for visually impaired users?", category: "Technical", difficulty: "Medium" },
      { id: "q2", text: "Walk me through how you would prioritize a backlog of 50 features with limited engineering capacity.", category: "Technical", difficulty: "Hard" },
      { id: "q3", text: "Tell me about a product you shipped that failed. What did you learn?", category: "Behavioral", difficulty: "Medium" },
    ],
  },
  {
    id: "qs-4",
    title: "Data Scientist Interview",
    company: "Netflix",
    companyInitials: "N",
    companyColor: "bg-red-500",
    difficulty: "Hard",
    skills: ["Python", "ML", "Statistics", "SQL", "A/B Testing"],
    totalQuestions: 14,
    estimatedTime: "50 min",
    category: "Data",
    description:
      "Deep-dive into machine learning fundamentals, statistical inference, experiment design, and data storytelling.",
    rating: 4.5,
    attempts: 650,
    questions: [
      { id: "q1", text: "Explain the bias-variance tradeoff and how it affects model selection.", category: "Technical", difficulty: "Hard" },
      { id: "q2", text: "How would you design an A/B test for Netflix's recommendation algorithm?", category: "Technical", difficulty: "Hard" },
    ],
  },
  {
    id: "qs-5",
    title: "Backend Engineer — Python/Django",
    company: "Shopify",
    companyInitials: "SH",
    companyColor: "bg-green-500",
    difficulty: "Medium",
    skills: ["Python", "Django", "Redis", "Celery", "AWS"],
    totalQuestions: 11,
    estimatedTime: "40 min",
    category: "Backend",
    description:
      "Backend-focused interview covering system design, caching strategies, async task processing, and cloud deployment.",
    rating: 4.4,
    attempts: 430,
    questions: [
      { id: "q1", text: "Describe how you would implement a distributed rate limiter.", category: "Technical", difficulty: "Hard" },
      { id: "q2", text: "How do you approach database query optimization in Django?", category: "Technical", difficulty: "Medium" },
    ],
  },
  {
    id: "qs-6",
    title: "DevOps / Cloud Engineer",
    company: "AWS",
    companyInitials: "AW",
    companyColor: "bg-orange-500",
    difficulty: "Hard",
    skills: ["Kubernetes", "Terraform", "CI/CD", "Docker", "AWS"],
    totalQuestions: 13,
    estimatedTime: "45 min",
    category: "DevOps",
    description:
      "Infrastructure, containerization, and cloud-native patterns for modern DevOps roles.",
    rating: 4.6,
    attempts: 320,
    questions: [
      { id: "q1", text: "Walk me through how you would set up a zero-downtime deployment pipeline.", category: "Technical", difficulty: "Hard" },
      { id: "q2", text: "Explain the difference between horizontal and vertical scaling. When do you use each?", category: "Technical", difficulty: "Medium" },
    ],
  },
];

// ── Practice History ───────────────────────────────────────────────────────
export const practiceSessions: PracticeSession[] = [
  {
    id: "ps-1",
    setId: "qs-1",
    setTitle: "Senior Frontend Developer Interview",
    company: "Meta",
    companyInitials: "M",
    companyColor: "bg-blue-500",
    date: "May 12, 2026",
    score: 82,
    duration: "38 min",
    skills: ["React", "TypeScript", "Next.js"],
    totalQuestions: 6,
    answers: [
      {
        questionId: "q1",
        questionText: "Explain React's reconciliation algorithm and how the virtual DOM works.",
        category: "Technical",
        difficulty: "Hard",
        answer:
          "React uses a diffing algorithm on a virtual DOM tree. When state changes, React creates a new virtual tree and compares it to the previous one. It updates only the changed nodes in the real DOM, avoiding expensive full re-renders.",
        aiScore: 78,
        strengths: ["Clear explanation of virtual DOM", "Mentioned performance benefits"],
        improvements: ["Did not mention fiber architecture", "Missing key prop optimization"],
        suggestion:
          "Expand on React Fiber's incremental rendering and how it enables prioritization of updates.",
      },
      {
        questionId: "q2",
        questionText: "How would you optimize a React app with thousands of list items?",
        category: "Technical",
        difficulty: "Medium",
        answer:
          "I would use virtualization via react-window or react-virtual to only render visible items. Additionally, memoize list items with React.memo and use useCallback for event handlers.",
        aiScore: 91,
        strengths: ["Mentioned virtualization", "Correct use of memoization", "Practical approach"],
        improvements: ["Could mention pagination as alternative"],
        suggestion:
          "Also consider lazy loading, pagination as a UX fallback, and profiling with React DevTools.",
      },
      {
        questionId: "q4",
        questionText: "Tell me about a time you resolved a critical production bug under pressure.",
        category: "Behavioral",
        difficulty: "Medium",
        answer:
          "During a product launch, our checkout flow broke due to a race condition. I immediately rolled back the recent deploy, then used git bisect to find the offending commit. Fixed it within 2 hours and added regression tests.",
        aiScore: 88,
        strengths: ["Clear STAR structure", "Showed ownership", "Mentioned prevention steps"],
        improvements: ["Could quantify business impact"],
        suggestion:
          "Add the impact: how many users were affected, what revenue was at risk, and how the fix prevented future occurrences.",
      },
    ],
  },
  {
    id: "ps-2",
    setId: "qs-2",
    setTitle: "Full Stack Engineer — Node + React",
    company: "Stripe",
    companyInitials: "S",
    companyColor: "bg-violet-500",
    date: "May 9, 2026",
    score: 74,
    duration: "32 min",
    skills: ["Node.js", "React", "PostgreSQL"],
    totalQuestions: 4,
    answers: [],
  },
  {
    id: "ps-3",
    setId: "qs-3",
    setTitle: "Product Manager Interview Prep",
    company: "Google",
    companyInitials: "G",
    companyColor: "bg-emerald-500",
    date: "May 5, 2026",
    score: 68,
    duration: "28 min",
    skills: ["Product Strategy", "Data Analysis"],
    totalQuestions: 3,
    answers: [],
  },
  {
    id: "ps-4",
    setId: "qs-1",
    setTitle: "Senior Frontend Developer Interview",
    company: "Meta",
    companyInitials: "M",
    companyColor: "bg-blue-500",
    date: "Apr 28, 2026",
    score: 71,
    duration: "41 min",
    skills: ["React", "TypeScript"],
    totalQuestions: 6,
    answers: [],
  },
];

// ── Candidate Stats ────────────────────────────────────────────────────────
const iconBg = "bg-gray-100 dark:bg-gray-800 shadow-sm ring-1 ring-black/5 dark:ring-white/10";
const iconColor = "text-gray-900 dark:text-gray-100";

export const candidateStats: CandidateStat[] = [
  {
    id: "sessions",
    label: "Practice Sessions",
    value: "24",
    trend: "+3 this week",
    trendPositive: true,
    icon: BookOpen,
    iconBg,
    iconColor,
  },
  {
    id: "avg-score",
    label: "Average Score",
    value: "78%",
    trend: "+4% vs last week",
    trendPositive: true,
    icon: Target,
    iconBg,
    iconColor,
  },
  {
    id: "streak",
    label: "Practice Streak",
    value: "7 days",
    trend: "Personal best",
    trendPositive: true,
    icon: Trophy,
    iconBg,
    iconColor,
  },
  {
    id: "readiness",
    label: "Interview Readiness",
    value: "High",
    trend: "AI assessed",
    trendPositive: true,
    icon: TrendingUp,
    iconBg,
    iconColor,
  },
];

// ── Achievements ───────────────────────────────────────────────────────────
export const achievements: Achievement[] = [
  { id: "a1", title: "First Practice", description: "Completed your first practice session", icon: "🎯", earned: true, earnedDate: "Apr 10, 2026" },
  { id: "a2", title: "7-Day Streak", description: "Practiced 7 days in a row", icon: "🔥", earned: true, earnedDate: "May 12, 2026" },
  { id: "a3", title: "High Scorer", description: "Scored 90+ in any session", icon: "⭐", earned: false },
  { id: "a4", title: "All Categories", description: "Answered Technical, Behavioral & Situational", icon: "🏆", earned: true, earnedDate: "Apr 28, 2026" },
  { id: "a5", title: "Speed Demon", description: "Finished a session 10 min under time limit", icon: "⚡", earned: false },
  { id: "a6", title: "Consistent Learner", description: "Completed 20+ sessions", icon: "📚", earned: true, earnedDate: "May 9, 2026" },
];
