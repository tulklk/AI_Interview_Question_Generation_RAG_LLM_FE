export const en = {
  common: {
    login: "Log in",
    getStarted: "Get Started",
    logout: "Log out",
    tryFree: "Try for Free",
  },

  nav: {
    home: "Home",
    features: "Features",
    pricing: "Pricing",
    contact: "Contact",
  },

  hero: {
    badge: "Powered by RAG + Large Language Models",
    headline1: "Generate Interview Questions",
    headline2: "from",
    headlineGradient: "Job Descriptions",
    headline3: "with AI",
    subtext:
      "Paste any job description and get tailored Technical, Behavioral, and Situational interview questions in seconds — powered by RAG and GPT-4.",
    point1: "Saves recruiter time",
    point2: "Context-aware questions",
    point3: "Export-ready PDF",
    ctaPrimary: "Try for Free",
    ctaSecondary: "Log in",
    mockupTitle: "InterviewAI — Question Generator",
    mockupJdLabel: "Job Description",
    mockupJdText:
      "We are looking for a Senior Frontend Developer with 5+ years of experience in React and TypeScript. Strong understanding of Next.js, SSR, and performance optimization required...",
    mockupKeywordsLabel: "Extracted Keywords",
    mockupAiLabel: "AI Suggested Answer",
    mockupQuestion:
      "Explain the difference between SSR and SSG in Next.js, and when would you choose each?",
    mockupAnswer:
      "SSR renders on every request — ideal for dynamic data. SSG pre-renders at build time for maximum performance. Choose based on data freshness requirements...",
  },

  benefits: {
    sectionLabel: "Why InterviewAI",
    headline: "Built for modern recruitment teams",
    subtext:
      "Everything you need to run consistent, thorough interviews — without spending hours on preparation.",
    items: [
      {
        title: "10x Faster Prep",
        description:
          "Generate a full interview set from any job description in under 30 seconds. No more manual question writing.",
      },
      {
        title: "Context-Aware AI",
        description:
          "RAG-powered retrieval grounds every question in real-world skills and industry knowledge from the JD.",
      },
      {
        title: "Evaluation Consistency",
        description:
          "Structured Technical, Behavioral, and Situational categories ensure every interview covers the full candidate profile.",
      },
      {
        title: "Export-Ready Sets",
        description:
          "Download your question sets as PDF or DOCX, share with teammates, or save to your session history.",
      },
    ],
  },

  features: {
    sectionLabel: "Platform Features",
    headline: "Everything you need for smarter hiring",
    subtext:
      "From JD parsing to export-ready question sets, every feature is designed to save time and improve interview quality.",
    items: [
      {
        title: "Job Description Input",
        description:
          "Paste any JD or upload a PDF/DOCX file. The AI parses the role, required skills, and experience level automatically.",
      },
      {
        title: "AI Skill Extraction",
        description:
          "The system identifies key competencies, technologies, and soft skills from your job description using NLP.",
      },
      {
        title: "RAG Knowledge Retrieval",
        description:
          "Retrieval-Augmented Generation pulls relevant knowledge from curated sources to ground questions in real expertise.",
      },
      {
        title: "Question Generation",
        description:
          "Generate role-specific Technical, Behavioral, and Situational questions tailored to experience level and domain.",
      },
      {
        title: "Suggested Answers",
        description:
          "Every question includes an AI-crafted suggested answer to help evaluators benchmark candidate responses.",
      },
      {
        title: "History & Export",
        description:
          "Access all past sessions from your history dashboard. Export to PDF or DOCX for use in interviews anytime.",
      },
    ],
  },

  workflow: {
    sectionLabel: "How It Works",
    headline: "From job description to interview-ready in 4 steps",
    subtext:
      "A simple, powerful workflow that turns any JD into a structured interview question set.",
    steps: [
      {
        title: "Enter Job Description",
        description:
          "Paste your JD text or upload a PDF/DOCX file directly into the platform.",
      },
      {
        title: "Extract Skills",
        description:
          "The AI identifies required skills, technologies, and experience level from the JD.",
      },
      {
        title: "Retrieve Knowledge",
        description:
          "RAG pulls relevant knowledge from curated sources to ground every question.",
      },
      {
        title: "Generate Questions",
        description:
          "Receive a categorized set of Technical, Behavioral, and Situational questions instantly.",
      },
    ],
  },

  pricing: {
    sectionLabel: "Pricing",
    headline: "Simple, transparent pricing",
    subtext: "Start free. Upgrade when you're ready. Cancel anytime.",
    mostPopular: "Most Popular",
    plans: [
      {
        name: "Free",
        period: "/ month",
        description: "For students and basic exploration of the platform.",
        cta: "Get Started Free",
        features: [
          "5 JD generations per month",
          "Basic question generation",
          "Technical questions only",
          "Limited export (3 per month)",
          "Community support",
          "Behavioral & Situational questions",
          "Suggested answers",
          "History tracking",
        ],
      },
      {
        name: "Pro",
        period: "/ month",
        description:
          "For recruiters and small teams who need full capabilities.",
        cta: "Start Pro Plan",
        features: [
          "100 JD generations per month",
          "Technical, Behavioral & Situational",
          "AI-generated suggested answers",
          "Unlimited PDF export",
          "Full session history",
          "Priority email support",
          "Team management",
          "Admin analytics dashboard",
        ],
      },
      {
        name: "Enterprise",
        period: "pricing",
        description:
          "For organizations that need scale, control, and dedicated support.",
        cta: "Contact Sales",
        features: [
          "Unlimited JD generations",
          "All Pro features included",
          "Team & role management",
          "Admin analytics dashboard",
          "Role-based access control",
          "Dedicated account manager",
          "Custom AI model configuration",
          "On-premise deployment option",
        ],
      },
    ],
  },

  demo: {
    sectionLabel: "Live Demo",
    headline: "See it in action",
    subtext:
      "Here's a real example of what InterviewAI generates from a Senior Frontend Developer job description.",
    jobTitle: "Senior Frontend Developer",
    generatedFor: "Generated for · Tech Corp Inc.",
    questionsCount: "questions",
    categories: {
      Technical: "Technical",
      Behavioral: "Behavioral",
      Situational: "Situational",
    },
    showAnswer: "Show Suggested Answer",
    hideAnswer: "Hide Suggested Answer",
    aiAnswerLabel: "AI Suggested Answer",
    difficulty: {
      Easy: "Easy",
      Medium: "Medium",
      Hard: "Hard",
    },
    questions: {
      t1: {
        question:
          "Explain the difference between Server-Side Rendering (SSR) and Static Site Generation (SSG) in Next.js, and when would you choose each?",
        suggestedAnswer:
          "SSR renders pages on every request at the server, ideal for dynamic data. SSG pre-renders at build time, best for content that rarely changes. Choose SSR when data freshness is critical; SSG when performance and CDN caching are priorities.",
      },
      t2: {
        question:
          "How would you optimize the performance of a React application that renders a large list of items?",
        suggestedAnswer:
          "Use virtualization (react-window or react-virtual), memoization with React.memo and useMemo, lazy loading with Suspense, and pagination or infinite scroll to avoid mounting all items at once.",
      },
      b1: {
        question:
          "Describe a time when you had to deliver a feature under tight deadline pressure. How did you prioritize and what was the outcome?",
        suggestedAnswer:
          "Look for evidence of scope negotiation, clear communication with stakeholders, breaking the problem into deliverable increments, and a reflection on what they would do differently.",
      },
      b2: {
        question:
          "Tell me about a situation where you disagreed with a technical decision made by your team lead. How did you handle it?",
        suggestedAnswer:
          "Strong candidates will show they raised concerns constructively with data/reasoning, listened to the team's perspective, and could either accept the decision gracefully or influence a better outcome.",
      },
      s1: {
        question:
          "You are midway through a sprint and discover that a core dependency has a critical security vulnerability. How would you handle this?",
        suggestedAnswer:
          "Immediately assess impact, notify the team and security stakeholders, evaluate patching vs. workaround options, communicate timeline impact to product, and document the incident for retrospective.",
      },
      s2: {
        question:
          "Your team is asked to integrate a third-party API that has poor documentation. What steps would you take to ensure a reliable integration?",
        suggestedAnswer:
          "Explore available sandbox environments, write exploratory tests, contact the provider for clarification, add robust error handling and retry logic, and thoroughly document your integration assumptions.",
      },
    },
  },

  testimonials: {
    sectionLabel: "Testimonials",
    headline: "Trusted by recruiters and educators",
    subtext:
      "See what professionals say about how InterviewAI transformed their hiring and evaluation process.",
    items: [
      {
        quote:
          "InterviewAI cut our interview preparation time by over 80%. The questions are genuinely tailored to each role — it's like having a senior recruiter on demand.",
        name: "Sarah Kim",
        role: "Talent Acquisition Lead",
        company: "Meta",
      },
      {
        quote:
          "As a tech lead who sits on many interview panels, the quality of the Technical questions is impressive. They map precisely to the skills in the JD.",
        name: "James Liu",
        role: "Senior Engineering Manager",
        company: "Stripe",
      },
      {
        quote:
          "I use this for my university evaluation panels. It generates exactly the kind of structured questions I need to assess both technical competence and soft skills.",
        name: "Dr. Emily Tran",
        role: "Lecturer, Computer Science",
        company: "FPT University",
      },
    ],
  },

  cta: {
    badge: "No credit card required",
    headline: "Start generating better interviews today",
    subtext:
      "Join hundreds of recruiters and educators using InterviewAI to build smarter, faster, and more consistent interview processes.",
    primary: "Get Started Free",
    secondary: "Log in to your account",
  },

  footer: {
    tagline:
      "AI-powered interview question generation from job descriptions. Built with RAG and LLMs to help recruiters and educators save time and hire better.",
    quickLinks: "Quick Links",
    legal: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    cookies: "Cookie Policy",
    builtWith: "Built with Next.js, TypeScript & TailwindCSS",
    copyright: "All rights reserved.",
  },

  sidebar: {
    subtitle: "Question Generator",
    sectionLabel: "Main Menu",
    nav: {
      "/dashboard": "Dashboard",
      "/generate": "Generate Questions",
      "/history": "History",
      "/settings": "Settings",
    },
    quickGenerate: {
      title: "Quick Generate",
      desc: "Paste a JD and get questions in 30 seconds",
      btn: "Start Now →",
    },
    logoutTitle: "Log out",
  },

  adminSidebar: {
    subtitle: "Admin Panel",
    sectionLabel: "Administration",
    nav: {
      "/admin/dashboard": "Dashboard",
      "/admin/users": "User Management",
      "/admin/analytics": "Analytics",
      "/admin/content": "Generated Content",
      "/admin/settings": "Settings",
    },
    systemStatus: {
      title: "System Status",
      desc: "All services operational",
      online: "Online",
    },
    logoutTitle: "Log out",
  },

  topHeader: {
    searchPlaceholder: "Search...",
  },

  appShell: {
    routes: {
      "/dashboard": "Dashboard",
      "/generate": "Generate Questions",
      "/history": "Session History",
      "/settings": "Settings",
      "/admin/dashboard": "Admin Dashboard",
      "/admin/users": "User Management",
      "/admin/analytics": "System Analytics",
      "/admin/content": "Generated Content",
      "/admin/settings": "Admin Settings",
    },
    breadcrumb: {
      dashboard: "Dashboard",
      generate: "Generate",
      history: "History",
      results: "Results",
      settings: "Settings",
      admin: "Admin",
      users: "Users",
      analytics: "Analytics",
      content: "Content",
    },
  },

  lang: {
    label: "Language",
  },
};

export type Translations = typeof en;
