import type {
  GenerationSession,
  GeneratedQuestion,
  ClarifyMessage,
  PlanDraft,
} from "@/types/generation-session";

export const mockClarifyMessages: ClarifyMessage[] = [
  {
    id: "c1",
    role: "ai",
    content:
      "I've analyzed your Job Description. To generate the most relevant interview questions, I need a few more details. How many years of experience are you targeting for this role?",
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
];

export const mockPlanDraft: PlanDraft = {
  role: "Senior Frontend Developer",
  level: "Senior (5-8 years)",
  questionCount: 15,
  questionTypes: ["Technical", "Behavioral", "Situational"],
  topics: [
    "React & Component Architecture",
    "TypeScript & Type Safety",
    "Performance Optimization",
    "State Management",
    "Testing & CI/CD",
    "Leadership & Mentoring",
  ],
  constraints: "Focus on real-world problem solving; include at least 3 system design questions",
  summary:
    "Generate 15 interview questions for a Senior Frontend Developer role emphasizing React, TypeScript, and performance. Mix of technical depth, behavioral scenarios, and situational judgment.",
};

export const mockGeneratedQuestions: GeneratedQuestion[] = [
  {
    id: "q1",
    question:
      "Explain the difference between useMemo and useCallback in React. When would misusing either cause performance regressions?",
    questionType: "Technical",
    difficulty: "Medium",
    rationale:
      "Tests deep understanding of React memoization hooks, not just surface-level usage.",
    sampleAnswer:
      "useMemo memoizes a computed value; useCallback memoizes a function reference. Misuse occurs when you add them to simple values or functions whose dependencies change every render — the memoization overhead then outweighs the benefit. Use useMemo for expensive calculations, useCallback for stable callbacks passed to memoized children.",
    citations: [
      { source: "React Docs – Hooks API Reference", excerpt: "useMemo will only recompute when one of the dependencies has changed." },
    ],
    orderIndex: 0,
  },
  {
    id: "q2",
    question:
      "How would you architect a large-scale React application to ensure code splitting and lazy loading are applied effectively?",
    questionType: "Technical",
    difficulty: "Hard",
    rationale:
      "Assesses the candidate's ability to design performant applications at scale.",
    sampleAnswer:
      "I would use React.lazy + Suspense for route-level splitting, dynamic imports for heavy components, prefetching critical routes on hover, and webpack's SplitChunksPlugin to extract vendor bundles. I'd monitor with Lighthouse and bundle-analyzer to measure impact on FCP and LCP.",
    citations: [
      { source: "Web.dev – Code Splitting", excerpt: "Code splitting is one of the most compelling features of webpack." },
    ],
    orderIndex: 1,
  },
  {
    id: "q3",
    question:
      "Describe a time when you identified and resolved a significant performance bottleneck in a production frontend application.",
    questionType: "Behavioral",
    difficulty: "Medium",
    rationale:
      "Evaluates real-world problem-solving and analytical skills under production constraints.",
    sampleAnswer:
      "Look for: clear description of the bottleneck (e.g., excessive re-renders, large bundle), tools used (Profiler, Lighthouse, DevTools), the fix implemented, measurable outcome (e.g., 40% reduction in LCP), and retrospective learnings.",
    citations: [],
    orderIndex: 2,
  },
  {
    id: "q4",
    question:
      "Your team is mid-sprint and discovers a core React version upgrade introduces breaking changes. How do you handle the situation?",
    questionType: "Situational",
    difficulty: "Hard",
    rationale:
      "Tests decision-making under pressure and ability to balance technical debt with delivery commitments.",
    sampleAnswer:
      "Assess blast radius by running the upgrade in a branch. Communicate impact to product and management immediately. Decide whether to defer the upgrade to a dedicated tech debt sprint or carve out capacity. Document breaking changes, write a migration guide, and pair with junior developers on the upgrade.",
    citations: [],
    orderIndex: 3,
  },
  {
    id: "q5",
    question:
      "How do you approach TypeScript configuration in a monorepo with shared packages and strict type safety requirements?",
    questionType: "Technical",
    difficulty: "Hard",
    rationale:
      "Assesses TypeScript expertise and understanding of build tooling in complex codebases.",
    sampleAnswer:
      "Use a root tsconfig with strict mode enabled and per-package tsconfigs that extend it. Use path aliases and project references for inter-package imports. Ensure declaration files are generated for each package. In strict mode: no implicit any, strictNullChecks enabled, and no unused variables.",
    citations: [
      { source: "TypeScript Handbook – Project References" },
    ],
    orderIndex: 4,
  },
];

export const mockGenerationSession: GenerationSession = {
  id: "session-1",
  jobTitle: "Senior Frontend Developer",
  jdContent:
    "We are looking for a Senior Frontend Developer with 5+ years of experience in React and TypeScript. Must have experience with Next.js, SSR, performance optimization, and modern testing practices.",
  note: {
    questionCount: 15,
    questionTypes: ["Technical", "Behavioral", "Situational"],
    focusSkills: "React, TypeScript, Performance",
    additionalNote: "Please include at least 3 system design questions.",
  },
  hrOwner: "hr@company.com",
  status: "COMPLETED",
  planDraft: mockPlanDraft,
  clarifyHistory: mockClarifyMessages,
  generatedQuestions: mockGeneratedQuestions,
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date().toISOString(),
};
