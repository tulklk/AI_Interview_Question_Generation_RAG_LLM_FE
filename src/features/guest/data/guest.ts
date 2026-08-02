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
} from "@/features/guest/types/guest";

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

/** Landing pricing: Candidate Free + Premium (giá khớp seed BE — VND). */
export const pricingPlansJobSeeker: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "0₫",
    period: "/ tháng",
    description: "Luyện bộ Marketplace với ~20% câu hỏi — không cần thẻ.",
    highlighted: false,
    cta: "Bắt đầu miễn phí",
    features: [
      { text: "Practice bộ Marketplace (kể cả bộ HR)", included: true },
      { text: "~20% câu hỏi hiển thị mỗi bộ", included: true },
      { text: "Feedback AI trên câu visible", included: true },
      { text: "Soft paywall — không gửi recommendation tới HR", included: true },
      { text: "Full bộ câu hỏi + full feedback", included: false },
      { text: "Gửi scorecard / recommendation tới HR", included: false },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "149.000₫",
    period: "/ tháng",
    description: "Full câu hỏi, full feedback và gửi recommendation tới HR.",
    highlighted: true,
    badge: "Recommended",
    cta: "Nâng Premium",
    features: [
      { text: "Full bộ câu hỏi Marketplace", included: true },
      { text: "Feedback AI đầy đủ mọi câu", included: true },
      { text: "Gửi scorecard / recommendation tới HR", included: true },
      { text: "Không giới hạn luyện tập trong kỳ", included: true },
      { text: "Ưu tiên hỗ trợ", included: true },
    ],
  },
];

/** Landing pricing: HR Free + Premium (giá khớp seed BE — VND). */
export const pricingPlansRecruiter: PricingPlan[] = [
  {
    id: "hr-free",
    name: "Free",
    price: "0₫",
    period: "/ tháng",
    description: "Tạo bộ câu hỏi từ JD với hạn mức Free — vẫn publish Marketplace.",
    highlighted: false,
    cta: "Bắt đầu Free",
    features: [
      { text: "Studio: tạo plan & bộ câu hỏi từ JD", included: true },
      { text: "Generate 1 lần / cooldown 24 giờ", included: true },
      { text: "Regenerate plan ≤ 5 lần / draft", included: true },
      { text: "Publish bộ câu hỏi lên Marketplace", included: true },
      { text: "Export PDF / DOCX", included: false },
      { text: "Ask-AI trong Studio", included: false },
      { text: "Generate không giới hạn", included: false },
    ],
  },
  {
    id: "hr-premium",
    name: "Premium",
    price: "699.000₫",
    period: "/ tháng",
    description: "Generate không giới hạn, export và Ask-AI cho đội HR.",
    highlighted: true,
    badge: "Recommended",
    cta: "Nâng Premium",
    features: [
      { text: "Mọi thứ trong Free", included: true },
      { text: "Generate bộ câu hỏi không giới hạn", included: true },
      { text: "Regenerate plan ≤ 5 lần / draft", included: true },
      { text: "Export PDF / DOCX", included: true },
      { text: "Ask-AI Studio — 1000 request / kỳ", included: true },
      { text: "Mua thêm pack Ask-AI khi hết hạn mức", included: true },
      { text: "Publish Marketplace không giới hạn", included: true },
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
