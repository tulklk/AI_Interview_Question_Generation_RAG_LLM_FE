import type { ResultSession } from "@/types/results";

export const mockResultSession: ResultSession = {
  jobTitle: "Senior Frontend Developer",
  keywords: [
    "React",
    "TypeScript",
    "State Management",
    "Testing",
    "SSR",
    "Performance Optimization",
    "REST APIs",
    "Next.js",
    "Webpack",
    "CI/CD",
  ],
  questions: [
    {
      id: 1,
      category: "Technical",
      difficulty: "Medium",
      tags: ["React", "Performance"],
      question:
        "Explain the difference between useMemo and useCallback hooks in React. When would you use each and what are the performance implications?",
      suggestedAnswer:
        "useMemo memoizes a computed value, while useCallback memoizes a function reference. Use useMemo for expensive calculations that depend on changing props/state, and useCallback to stabilize function props passed to memoized child components. Both prevent unnecessary re-renders but serve different purposes — misusing them adds overhead without benefit.",
    },
    {
      id: 2,
      category: "Technical",
      difficulty: "Hard",
      tags: ["React", "SSR", "Next.js"],
      question:
        "How would you implement server-side rendering (SSR) in a React application from scratch, and what are the key challenges?",
      suggestedAnswer:
        "SSR involves rendering React component trees to HTML strings on a Node.js server using ReactDOM/server. Challenges include: hydration mismatches, managing server-only vs client-only code, data fetching on server, streaming HTML (React 18 Suspense), and performance optimization of the node process.",
    },
    {
      id: 3,
      category: "Technical",
      difficulty: "Hard",
      tags: ["React", "State Management", "Architecture"],
      question:
        "Describe your approach to state management in large-scale React applications. What factors influence your choice of solution?",
      suggestedAnswer:
        "I evaluate complexity (local vs global state), update frequency, team familiarity, and bundle size. For simple local state: Context API. For complex async logic: Redux Toolkit with RTK Query. For lighter solutions: Zustand or Jotai. The goal is minimal complexity for the actual use case.",
    },
    {
      id: 4,
      category: "Technical",
      difficulty: "Medium",
      tags: ["Performance", "Webpack", "React"],
      question:
        "Walk me through how you'd implement code splitting in a React app and what impact it has on performance metrics.",
      suggestedAnswer:
        "Use React.lazy + Suspense with dynamic imports, route-level splitting via react-router, and vendor chunking in webpack. Measure impact via Lighthouse (FCP, LCP, TTI) and bundle analysis. Prefetch critical routes on hover to balance lazy loading with perceived performance.",
    },
    {
      id: 1,
      category: "Behavioral",
      difficulty: "Medium",
      tags: ["Problem Solving", "Communication"],
      question:
        "Tell me about a time when you had to debug a complex production issue under significant time pressure. How did you approach it?",
      suggestedAnswer:
        "Look for: structured debugging approach (reproduce → isolate → hypothesize → test), use of monitoring tools (Sentry, DataDog), clear stakeholder communication, ability to stay calm under pressure, rollback decision-making, and post-mortem documentation.",
    },
    {
      id: 2,
      category: "Behavioral",
      difficulty: "Medium",
      tags: ["Communication", "Teamwork"],
      question:
        "Describe a situation where you disagreed with a technical decision made by your team lead. How did you handle it?",
      suggestedAnswer:
        "Strong answers show: respectful direct communication, data-driven arguments, willingness to prototype alternatives, ability to commit once a decision is made, and focus on outcomes over ego. Red flags: going around leadership or passive compliance without voicing concerns.",
    },
    {
      id: 3,
      category: "Behavioral",
      difficulty: "Easy",
      tags: ["Learning Agility", "Problem Solving"],
      question:
        "Give me an example of a time when you had to learn a new technology quickly to complete a project. What was your approach?",
      suggestedAnswer:
        "Ideal answers include: identifying the minimum viable knowledge needed, using official docs + structured tutorials, building a small proof-of-concept, asking the right colleagues for help, and iterating quickly. Demonstrates learning strategy and intellectual humility.",
    },
    {
      id: 1,
      category: "Situational",
      difficulty: "Hard",
      tags: ["Testing", "Strategy", "Architecture"],
      question:
        "If you inherited a legacy codebase with poor test coverage and outdated dependencies, how would you approach improving it without disrupting ongoing feature development?",
      suggestedAnswer:
        "Incremental approach: audit current state → identify highest-risk areas → add tests for new changes first (strangler fig pattern) → progressively refactor. Use feature flags to de-risk migrations. Never rewrite all at once — prioritize by business impact and failure probability.",
    },
    {
      id: 2,
      category: "Situational",
      difficulty: "Medium",
      tags: ["Communication", "Problem Solving", "Teamwork"],
      question:
        "You're midway through a sprint and discover the API you're building against has a breaking change. How do you handle this?",
      suggestedAnswer:
        "Immediately communicate to stakeholders (PM, backend team). Assess impact on sprint goal. Options: implement version shim, negotiate timeline with backend, deprioritize affected stories. Document the dependency in future planning. Avoid silently absorbing the change.",
    },
    {
      id: 3,
      category: "Situational",
      difficulty: "Hard",
      tags: ["Performance", "React", "Webpack"],
      question:
        "Suppose you're asked to improve the performance of a React app that has a 6-second initial load time. What's your step-by-step process?",
      suggestedAnswer:
        "Profile first (Lighthouse, Chrome DevTools, bundle-analyzer). Common wins: code splitting, tree shaking, image optimization, font subsetting, removing unused deps, moving heavy libs async, CDN for static assets, HTTP/2, preconnect hints. Measure before and after each change.",
    },
  ],
};
