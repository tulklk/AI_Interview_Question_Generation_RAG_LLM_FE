import {
  Timer,
  Brain,
  ClipboardCheck,
  Download,
  FileText,
  Sparkles,
  BookOpen,
  History,
  MessageSquare,
  Database,
  Upload,
  CheckCircle2,
} from "lucide-react";
import type {
  BenefitItem,
  FeatureItem,
  WorkflowStep,
  PricingPlan,
  Testimonial,
  DemoQuestion,
} from "@/types/guest";

export const benefits: BenefitItem[] = [
  {
    id: "speed",
    icon: Timer,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    title: "10x Faster Prep",
    description:
      "Generate a full interview set from any job description in under 30 seconds. No more manual question writing.",
  },
  {
    id: "context",
    icon: Brain,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    title: "Context-Aware AI",
    description:
      "RAG-powered retrieval grounds every question in real-world skills and industry knowledge from the JD.",
  },
  {
    id: "consistency",
    icon: ClipboardCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    title: "Evaluation Consistency",
    description:
      "Structured Technical, Behavioral, and Situational categories ensure every interview covers the full candidate profile.",
  },
  {
    id: "export",
    icon: Download,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    title: "Export-Ready Sets",
    description:
      "Download your question sets as PDF or DOCX, share with teammates, or save to your session history.",
  },
];

export const features: FeatureItem[] = [
  {
    id: "jd-input",
    icon: FileText,
    title: "Job Description Input",
    description:
      "Paste any JD or upload a PDF/DOCX file. The AI parses the role, required skills, and experience level automatically.",
  },
  {
    id: "skill-extraction",
    icon: Brain,
    title: "AI Skill Extraction",
    description:
      "The system identifies key competencies, technologies, and soft skills from your job description using NLP.",
  },
  {
    id: "rag-retrieval",
    icon: Database,
    title: "RAG Knowledge Retrieval",
    description:
      "Retrieval-Augmented Generation pulls relevant knowledge from curated sources to ground questions in real expertise.",
  },
  {
    id: "question-generation",
    icon: Sparkles,
    title: "Question Generation",
    description:
      "Generate role-specific Technical, Behavioral, and Situational questions tailored to experience level and domain.",
  },
  {
    id: "suggested-answers",
    icon: MessageSquare,
    title: "Suggested Answers",
    description:
      "Every question includes an AI-crafted suggested answer to help evaluators benchmark candidate responses.",
  },
  {
    id: "history-export",
    icon: History,
    title: "History & Export",
    description:
      "Access all past sessions from your history dashboard. Export to PDF or DOCX for use in interviews anytime.",
  },
];

export const workflowSteps: WorkflowStep[] = [
  {
    step: 1,
    icon: Upload,
    title: "Enter Job Description",
    description: "Paste your JD text or upload a PDF/DOCX file directly into the platform.",
  },
  {
    step: 2,
    icon: Brain,
    title: "Extract Skills",
    description: "The AI identifies required skills, technologies, and experience level from the JD.",
  },
  {
    step: 3,
    icon: Database,
    title: "Retrieve Knowledge",
    description: "RAG pulls relevant knowledge from curated sources to ground every question.",
  },
  {
    step: 4,
    icon: BookOpen,
    title: "Generate Questions",
    description: "Receive a categorized set of Technical, Behavioral, and Situational questions instantly.",
  },
];

/** Landing pricing: job seekers & interview prep (Free + paid Plus). */
export const pricingPlansJobSeeker: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/ month",
    description: "For students and first-time users who want to explore the platform.",
    highlighted: false,
    cta: "Get Started Free",
    features: [
      { text: "5 JD generations per month", included: true },
      { text: "Basic question generation", included: true },
      { text: "Technical questions only", included: true },
      { text: "Limited PDF export (3 per month)", included: true },
      { text: "Standard AI feedback", included: true },
      { text: "Community support", included: true },
      { text: "Behavioral & situational questions", included: false },
      { text: "AI-generated suggested answers", included: false },
      { text: "Full history & saved practice sets", included: false },
      { text: "Advanced HR-aligned evaluation", included: false },
    ],
  },
  {
    id: "seeker-plus",
    name: "Plus",
    price: "$9",
    period: "/ month",
    description:
      "For serious job seekers who want targeted interview preparation and stronger answers.",
    highlighted: true,
    badge: "Most Popular",
    cta: "Get Plus",
    features: [
      { text: "50 JD generations per month", included: true },
      { text: "Full access: technical, behavioral, and situational questions", included: true },
      { text: "AI-generated suggested answers", included: true },
      { text: "Advanced AI evaluation (role-specific criteria)", included: true },
      { text: "Unlimited PDF export for personal use", included: true },
      { text: "Full history and saved practice sets", included: true },
      { text: "Role-specific interview preparation tips", included: true },
      { text: "Email support within 48 hours", included: true },
      { text: "Recruiter team & admin tools", included: false },
    ],
  },
];

/** Landing pricing: HR / IQGS — Basic, Professional, Business, Enterprise. */
export const pricingPlansRecruiter: PricingPlan[] = [
  {
    id: "hr-basic",
    name: "Basic",
    price: "$0",
    period: "/ month",
    description:
      "For HR users who want to explore basic recruitment management tools before using AI-powered features.",
    highlighted: false,
    cta: "Start Free",
    features: [
      { text: "Basic JDs", included: true },
      { text: "Manual JD", included: true },
      { text: "Manual sets", included: true },
      { text: "Categories", included: true },
      { text: "Tags T/B/S", included: true },
      { text: "Difficulty", included: true },
      { text: "Inbox", included: true },
      { text: "Dashboard", included: true },
      { text: "Limited sets", included: true },
      { text: "No AI gen", included: false },
      { text: "No RAG", included: false },
      { text: "No advanced analytics", included: false },
      { text: "No branded publish", included: false },
    ],
  },
  {
    id: "hr-professional",
    name: "Professional",
    price: "$29",
    period: "/ month",
    description:
      "For HR teams that want to save time and generate accurate interview questions directly from Job Descriptions.",
    highlighted: true,
    badge: "Recommended",
    cta: "Start Professional",
    features: [
      { text: "All Basic", included: true },
      { text: "AI from JD", included: true },
      { text: "PDF DOCX JD", included: true },
      { text: "RAG", included: true },
      { text: "TBS gen", included: true },
      { text: "Difficulty AI", included: true },
      { text: "Save AI sets", included: true },
      { text: "Branded publish", included: true },
      { text: "Practice inbox", included: true },
      { text: "Basic insights", included: true },
      { text: "PDF export", included: true },
      { text: "Email support", included: true },
      { text: "Limits 50-20-3", included: true },
    ],
  },
  {
    id: "hr-business",
    name: "Business",
    price: "$79",
    period: "/ month",
    description:
      "For growing HR teams that need deeper analytics, higher usage limits, and stronger candidate insight.",
    highlighted: false,
    cta: "Upgrade to Business",
    features: [
      { text: "All Pro", included: true },
      { text: "200 AI", included: true },
      { text: "Unlimited saved", included: true },
      { text: "Unlimited branded", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Comparison reports", included: true },
      { text: "Trend dashboard", included: true },
      { text: "Team usage", included: true },
      { text: "Advanced export", included: true },
      { text: "Priority email", included: true },
      { text: "10 seats", included: true },
    ],
  },
  {
    id: "hr-enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For large hiring teams that need custom limits, advanced control, and dedicated support.",
    highlighted: false,
    cta: "Contact Sales",
    features: [
      { text: "Custom AI volume", included: true },
      { text: "Custom team size", included: true },
      { text: "Dedicated workspace", included: true },
      { text: "Advanced admin", included: true },
      { text: "Custom reports", included: true },
      { text: "API integrations", included: true },
      { text: "Dedicated support", included: true },
      { text: "Custom onboarding", included: true },
    ],
  },
];

export const testimonials: Testimonial[] = [
  {
    id: "1",
    quote:
      "InterviewAI cut our interview preparation time by over 80%. The questions are genuinely tailored to each role — it's like having a senior recruiter on demand.",
    name: "Sarah Kim",
    role: "Talent Acquisition Lead",
    company: "Meta",
    initials: "SK",
    avatarColor: "bg-blue-500",
  },
  {
    id: "2",
    quote:
      "As a tech lead who sits on many interview panels, the quality of the Technical questions is impressive. They map precisely to the skills in the JD.",
    name: "James Liu",
    role: "Senior Engineering Manager",
    company: "Stripe",
    initials: "JL",
    avatarColor: "bg-violet-500",
  },
  {
    id: "3",
    quote:
      "I use this for my university evaluation panels. It generates exactly the kind of structured questions I need to assess both technical competence and soft skills.",
    name: "Dr. Emily Tran",
    role: "Lecturer, Computer Science",
    company: "FPT University",
    initials: "ET",
    avatarColor: "bg-emerald-500",
  },
];

export const demoKeywords = [
  "React",
  "TypeScript",
  "Next.js",
  "SSR",
  "REST API",
  "GraphQL",
  "CI/CD",
  "System Design",
];

export const demoQuestions: DemoQuestion[] = [
  {
    id: "t1",
    category: "Technical",
    question:
      "Explain the difference between Server-Side Rendering (SSR) and Static Site Generation (SSG) in Next.js, and when would you choose each?",
    difficulty: "Medium",
    tags: ["Next.js", "SSR", "SSG"],
    suggestedAnswer:
      "SSR renders pages on every request at the server, ideal for dynamic data. SSG pre-renders at build time, best for content that rarely changes. Choose SSR when data freshness is critical; SSG when performance and CDN caching are priorities.",
  },
  {
    id: "t2",
    category: "Technical",
    question:
      "How would you optimize the performance of a React application that renders a large list of items?",
    difficulty: "Hard",
    tags: ["React", "Performance", "Virtualization"],
    suggestedAnswer:
      "Use virtualization (react-window or react-virtual), memoization with React.memo and useMemo, lazy loading with Suspense, and pagination or infinite scroll to avoid mounting all items at once.",
  },
  {
    id: "b1",
    category: "Behavioral",
    question:
      "Describe a time when you had to deliver a feature under tight deadline pressure. How did you prioritize and what was the outcome?",
    difficulty: "Medium",
    tags: ["Time Management", "Prioritization"],
    suggestedAnswer:
      "Look for evidence of scope negotiation, clear communication with stakeholders, breaking the problem into deliverable increments, and a reflection on what they would do differently.",
  },
  {
    id: "b2",
    category: "Behavioral",
    question:
      "Tell me about a situation where you disagreed with a technical decision made by your team lead. How did you handle it?",
    difficulty: "Medium",
    tags: ["Conflict Resolution", "Communication"],
    suggestedAnswer:
      "Strong candidates will show they raised concerns constructively with data/reasoning, listened to the team's perspective, and could either accept the decision gracefully or influence a better outcome.",
  },
  {
    id: "s1",
    category: "Situational",
    question:
      "You are midway through a sprint and discover that a core dependency has a critical security vulnerability. How would you handle this?",
    difficulty: "Hard",
    tags: ["Security", "Decision Making"],
    suggestedAnswer:
      "Immediately assess impact, notify the team and security stakeholders, evaluate patching vs. workaround options, communicate timeline impact to product, and document the incident for retrospective.",
  },
  {
    id: "s2",
    category: "Situational",
    question:
      "Your team is asked to integrate a third-party API that has poor documentation. What steps would you take to ensure a reliable integration?",
    difficulty: "Medium",
    tags: ["API Integration", "Problem Solving"],
    suggestedAnswer:
      "Explore available sandbox environments, write exploratory tests, contact the provider for clarification, add robust error handling and retry logic, and thoroughly document your integration assumptions.",
  },
];

export { CheckCircle2 };
