import {
  Monitor,
  Server,
  Layers,
  BarChart2,
  Brain,
  Briefcase,
  Palette,
  Cloud,
  Smartphone,
  TestTube,
} from "lucide-react";
import type { JobRole, ExperienceLevel, QuestionCountOption } from "@/types/generate";

export const jobRoles: JobRole[] = [
  { id: "frontend", label: "Frontend Developer", icon: Monitor, color: "text-blue-500" },
  { id: "backend", label: "Backend Developer", icon: Server, color: "text-green-500" },
  { id: "fullstack", label: "Full Stack Developer", icon: Layers, color: "text-violet-500" },
  { id: "data", label: "Data Scientist", icon: BarChart2, color: "text-amber-500" },
  { id: "ml", label: "ML Engineer", icon: Brain, color: "text-pink-500" },
  { id: "product", label: "Product Manager", icon: Briefcase, color: "text-orange-500" },
  { id: "uiux", label: "UI/UX Designer", icon: Palette, color: "text-rose-500" },
  { id: "devops", label: "DevOps Engineer", icon: Cloud, color: "text-cyan-500" },
  { id: "mobile", label: "Mobile Developer", icon: Smartphone, color: "text-indigo-500" },
  { id: "qa", label: "QA Engineer", icon: TestTube, color: "text-teal-500" },
];

export const experienceLevels: ExperienceLevel[] = [
  { id: "intern", label: "Intern / Trainee (< 1 year)" },
  { id: "junior", label: "Junior (0–2 years)" },
  { id: "midlevel", label: "Mid-Level (2–5 years)" },
  { id: "senior", label: "Senior (5+ years)" },
  { id: "lead", label: "Lead / Principal (8+ years)" },
  { id: "manager", label: "Engineering Manager (—)" },
];

export const questionCounts: QuestionCountOption[] = [
  { value: 5, label: "5 questions" },
  { value: 10, label: "10 questions" },
  { value: 15, label: "15 questions" },
  { value: 20, label: "20 questions" },
];

export const generatingSteps = [
  "Parsing job description...",
  "Extracting key skills & requirements...",
  "Querying knowledge base with RAG...",
  "Generating tailored questions with AI...",
  "Categorizing & scoring difficulty...",
  "Finalizing your question set...",
];
