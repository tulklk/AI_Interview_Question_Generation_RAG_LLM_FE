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
    mockupTitle: "HireGen AI — Question Generator",
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
    sectionLabel: "Why HireGen AI",
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
      "Here's a real example of what HireGen AI generates from a Senior Frontend Developer job description.",
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
      "See what professionals say about how HireGen AI transformed their hiring and evaluation process.",
    items: [
      {
        quote:
          "HireGen AI cut our interview preparation time by over 80%. The questions are genuinely tailored to each role — it's like having a senior recruiter on demand.",
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
      "Join hundreds of recruiters and educators using HireGen AI to build smarter, faster, and more consistent interview processes.",
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

  loginPage: {
    welcome: "Welcome back",
    subtitle: "Sign in to your account to continue",
    emailLabel: "Email Address",
    emailPlaceholder: "you@company.com",
    passwordLabel: "Password",
    forgotPassword: "Forgot password?",
    rememberMe: "Remember me for 30 days",
    signIn: "Sign in",
    orContinueWith: "or continue with",
    noAccount: "Don't have an account?",
    signUpFree: "Sign up free",
    legal: "By continuing, you agree to our",
    terms: "Terms",
    privacyPolicy: "Privacy Policy",
  },

  dashboardPage: {
    welcome: "Good morning, HR Manager 👋",
    welcomeSub: "Here's what's happening with your recruitment toolkit today.",
    generateBtn: "Generate Questions",
    statLabels: [
      "Total JDs Processed",
      "Questions Generated",
      "This Week",
      "Avg Questions / JD",
    ],
    weeklyActivity: {
      title: "Weekly Activity",
      subtitle: "Questions generated this week",
      questions: "Questions",
      jds: "JDs",
    },
    categoryBreakdown: {
      title: "By Category",
      subtitle: "Question type breakdown",
      questions: "Questions",
    },
    recentSessions: {
      title: "Recent Sessions",
      subtitle: "Your latest question generation sessions",
      viewAll: "View all",
      qs: "Qs",
    },
    quickGenerate: {
      title: "Generate New Questions",
      desc: "Upload or paste a job description to get AI-powered interview questions in seconds.",
      btn: "Get Started →",
    },
  },

  generatePage: {
    heading: "Generate Interview Questions",
    subtext:
      "Paste your job description or upload a file to get AI-powered, role-specific questions instantly.",
    jdInput: {
      title: "Job Description",
      placeholder: "Paste your job description here...",
      exampleLabel: "Example:",
      exampleText:
        "We are looking for a Senior Frontend Developer with 5+ years of React experience, strong TypeScript skills, and deep understanding of performance optimization...",
      words: "words",
      word: "word",
      chars: "chars",
      tooShort: "Too short",
      clear: "Clear",
    },
    fileUpload: {
      label: "Drag & drop a file, or click to browse",
      support: "Supports PDF, DOCX, DOC (max 10MB)",
    },
    config: {
      title: "Configuration",
      jobRole: "Job Role",
      jobRolePlaceholder: "Select role...",
      experienceLevel: "Experience Level",
      experienceLevelPlaceholder: "Select level...",
      questionsPerCategory: "Questions per Category",
      helperText: "Per category (Technical, Behavioral, Situational)",
      readyBanner: "Ready to generate!",
      aiWillCreate: "AI will create up to",
      questions: "questions",
      acrossCategories:
        "across Technical, Behavioral, and Situational categories for a",
      roleWord: "role.",
      generateBtn: "Generate Interview Questions",
    },
    progress: {
      heading: "AI is generating your questions",
      subtext: "Please wait while we craft tailored interview questions...",
      done: "Done",
      progressLabel: "Progress",
    },
    steps: [
      "Parsing job description...",
      "Extracting key skills & requirements...",
      "Querying knowledge base with RAG...",
      "Generating tailored questions with AI...",
      "Categorizing & scoring difficulty...",
      "Finalizing your question set...",
    ],
  },

  historyPage: {
    heading: "History",
    subtext: "Browse and manage your past question generation sessions.",
    statLabels: ["Total Sessions", "Questions Generated", "This Month"],
    filters: {
      searchPlaceholder: "Search by job title...",
      allRoles: "All Roles",
      allLevels: "All Levels",
      exportAll: "Export All",
    },
    table: {
      jobTitle: "Job Title",
      role: "Role",
      level: "Level",
      date: "Date",
      questions: "Questions",
      actions: "Actions",
    },
  },

  settingsPage: {
    heading: "Settings",
    subtext: "Manage your account, preferences, and AI configuration.",
    tabs: {
      profile: "Profile",
      preferences: "Preferences",
      notifications: "Notifications",
      security: "Security",
      billing: "Billing",
    },
    profile: {
      title: "Profile Information",
      photo: "Profile Photo",
      photoFormats: "JPG, PNG, GIF up to 2MB",
      uploadPhoto: "Upload Photo",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email Address",
      company: "Company",
      jobTitle: "Job Title",
      bio: "Bio",
      save: "Save Changes",
    },
    preferences: {
      title: "Preferences",
      appearance: "Appearance",
      darkMode: "Dark Mode",
      darkModeDesc: "Switch between light and dark interface",
      light: "Light",
      dark: "Dark",
      system: "System",
      aiSettings: "AI Settings",
      aiModel: "AI Model",
      outputLanguage: "Output Language",
      questionsPerCategory: "Questions per Category",
      questionTone: "Question Tone",
      showDifficulty: "Show difficulty badges",
      showDifficultyDesc: "Label each question as Easy, Medium, or Hard",
      includeAnswers: "Include suggested answers",
      includeAnswersDesc: "Generate AI-suggested answers for each question",
      save: "Save Changes",
    },
    notifications: {
      title: "Notification Preferences",
      save: "Save Changes",
    },
    security: {
      title: "Security Settings",
      currentPassword: "Current Password",
      newPassword: "New Password",
      confirmPassword: "Confirm New Password",
      currentPlaceholder: "Enter your current password",
      newPlaceholder: "Enter a new secure password",
      confirmPlaceholder: "Repeat your new password",
      requirements: "Password Requirements",
      req1: "At least 8 characters long",
      req2: "Contains uppercase and lowercase letters",
      req3: "Contains at least one number or symbol",
      save: "Save Changes",
    },
    billing: {
      title: "Billing & Subscription",
      currentPlan: "Current Plan",
      planName: "Professional",
      active: "Active",
      perMonth: "/month",
      planFeatures: [
        "Unlimited JD processing",
        "Advanced AI models (GPT-4)",
        "PDF/DOCX export",
        "Priority support",
      ],
      upgradeBtn: "Upgrade Plan",
      manageBtn: "Manage Plan",
      monthlyUsage: "Monthly Usage",
      billingHistory: "Billing History",
      paid: "Paid",
      download: "Download",
    },
  },

  resultsPage: {
    backToHistory: "Back to History",
    interviewQuestions: "Interview Questions",
    generatedFor: "Generated for:",
    totalQuestions: "total questions",
    categories: "categories",
    readyToUse: "Ready to use",
    exportToPdf: "Export to PDF",
    keywords: {
      title: "Extracted Keywords from JD",
      found: "found",
    },
    questionCard: {
      difficulty: {
        Easy: "Easy",
        Medium: "Medium",
        Hard: "Hard",
      },
      showAnswer: "Show Suggested Answer",
      hideAnswer: "Hide Suggested Answer",
      aiAnswerLabel: "AI Suggested Answer",
      copy: "Copy",
      edit: "Edit",
      regenerate: "Regenerate",
      delete: "Delete",
    },
    tabs: {
      Technical: "Technical",
      Behavioral: "Behavioral",
      Situational: "Situational",
    },
  },

  chatWidget: {
    title: "HireGen AI",
    subtitle: "Online · Quick response",
    placeholder: "Ask me anything...",
    send: "Send",
    clear: "Clear chat",
    welcomeMessage: "Hi there! I'm the HireGen AI assistant. I can help you with:",
    welcomePoints: [
      "How the platform works",
      "Pricing plans & features",
      "Exporting questions to PDF",
      "Getting started for free",
    ],
    typing: "Typing...",
    suggestedQuestions: [
      "What are the pricing plans?",
      "How does it work?",
      "Can I export to PDF?",
    ],
    responses: {
      pricing:
        "We offer 3 plans:\n• Free — 10 generations/month\n• Pro ($19/mo) — unlimited generations + PDF export\n• Enterprise — custom pricing for teams\n\nStart free, no credit card required!",
      features:
        "HireGen AI extracts key skills from your Job Description, then generates tailored Technical, Behavioral, and Situational questions — all powered by RAG + GPT-4. You can also export the full set as a PDF.",
      howItWorks:
        "It's simple:\n1. Paste your Job Description\n2. AI extracts keywords & role context\n3. Questions are generated in under 30 seconds\n4. Export or copy your question set",
      export:
        "Yes! All generated question sets can be exported to a clean, formatted PDF — ready to use in your interview panel.",
      vietnamese:
        "HireGen AI fully supports Vietnamese job descriptions and can generate questions in Vietnamese too!",
      fallback:
        "That's a great question! Sign up for free to explore all features — or feel free to ask me anything else about HireGen AI.",
    },
  },

  adminPages: {
    dashboard: {
      welcome: "Good morning, Administrator 👋",
      welcomeSub: "Here's a platform-wide overview for today.",
      addUser: "Add User",
      statLabels: [
        "Total Users",
        "Total Recruiters",
        "JDs Processed",
        "Questions Generated",
      ],
      userGrowth: {
        title: "User Growth",
        subtitle: "New registrations per week",
        recruiters: "Recruiters",
        guests: "Guests",
      },
      questionsTrend: {
        title: "Questions Generated",
        subtitle: "Daily generation volume this week",
        questions: "Questions",
      },
      recentActivity: {
        title: "Recent System Activity",
        subtitle: "Latest platform events",
        event: "Event",
        actor: "Actor",
        details: "Details",
        time: "Time",
        eventLabels: {
          user_created: "User Created",
          recruiter_login: "Login",
          jd_generation: "Generation",
          export: "Export",
        },
      },
    },
    users: {
      heading: "User Management",
      subtext: "Manage all platform accounts, roles, and access.",
      addUser: "Add User",
      stats: {
        totalUsers: "Total Users",
        activeUsers: "Active Users",
        pendingApproval: "Pending Approval",
      },
      filters: {
        searchPlaceholder: "Search by name or email...",
        allRoles: "All Roles",
        allStatus: "All Status",
      },
      table: {
        name: "Name",
        email: "Email",
        role: "Role",
        status: "Status",
        created: "Created",
        lastActive: "Last Active",
        actions: "Actions",
      },
      modal: {
        editTitle: "Edit User",
        addTitle: "Add New User",
        fullName: "Full Name",
        emailLabel: "Email Address",
        role: "Role",
        status: "Status",
        namePlaceholder: "e.g. Sarah Kim",
        emailPlaceholder: "user@company.com",
        cancel: "Cancel",
        save: "Save Changes",
        create: "Create User",
      },
      roles: { Admin: "Admin", Recruiter: "Recruiter", Guest: "Guest" },
      statusLabels: { Active: "Active", Pending: "Pending", Suspended: "Suspended" },
      actions: { view: "View", edit: "Edit", disable: "Disable", delete: "Delete" },
    },
    analytics: {
      heading: "System Analytics",
      subtext: "Platform-wide performance and usage insights.",
      weeklyUsage: {
        title: "Weekly Platform Usage",
        subtitle: "Active users vs JD submissions",
        activeUsers: "Active Users",
        jdSubmissions: "JD Submissions",
      },
      categoryChart: {
        title: "Question Categories",
        subtitle: "Distribution across all sessions",
        questions: "Questions",
      },
      roleDistribution: {
        title: "User Role Distribution",
        subtitle: "Breakdown by account type",
        users: "users",
        total: "Total registered users",
      },
    },
    content: {
      heading: "Generated Content",
      subtext: "Browse all interview question sessions generated across the platform.",
      exportAll: "Export All",
      filters: {
        searchPlaceholder: "Search by job title or recruiter...",
        allRoles: "All Roles",
        allTime: "All Time",
        today: "Today",
        thisWeek: "This Week",
        thisMonth: "This Month",
        last3Months: "Last 3 Months",
      },
      table: {
        jobTitle: "Job Title",
        recruiter: "Recruiter",
        role: "Role",
        date: "Date",
        questions: "Questions",
        exported: "Exported",
        actions: "Actions",
      },
      exportedLabel: "Exported",
      notExported: "Not exported",
    },
    settings: {
      heading: "Admin Settings",
      subtext: "Configure platform behavior, AI model, access permissions, and notifications.",
      tabs: {
        general: "General",
        aiConfig: "AI Configuration",
        permissions: "Permissions",
        notifications: "Notifications",
      },
      general: {
        title: "General Settings",
        platformName: "Platform Name",
        defaultQuestionCount: "Default Question Count",
        maxJDs: "Max JDs Per Day (per user)",
        sessionTimeout: "Session Timeout (minutes)",
        dangerZone: "Danger Zone",
        resetTitle: "Reset Platform Data",
        resetDesc: "Clear all generated sessions and analytics. This cannot be undone.",
        resetBtn: "Reset",
        saveBtn: "Save Changes",
      },
      aiConfig: {
        title: "AI Configuration",
        categories: "Default Question Categories",
        includePrefix: "Include",
        includeSuffix: "questions by default",
        languageModel: "Language Model",
        temperature: "Temperature",
        tempHint: "0 = deterministic, 1 = creative",
        maxTokens: "Max Tokens",
        saveBtn: "Save AI Config",
        categoryLabels: ["Technical", "Behavioral", "Situational", "Cultural", "Leadership"],
      },
      permissions: {
        title: "User Permissions",
        feature: "Feature",
        adminCol: "Admin",
        recruiterCol: "Recruiter",
        guestCol: "Guest",
        lockedNote: "Admin permissions are locked and cannot be modified.",
        saveBtn: "Save Permissions",
        features: [
          { label: "Generate Questions", desc: "Access the JD question generator" },
          { label: "View History", desc: "Browse past generation sessions" },
          { label: "Export Sessions", desc: "Export questions to PDF/DOCX" },
          { label: "View Analytics", desc: "Access usage and analytics data" },
          { label: "Manage Users", desc: "Create, edit, and disable accounts" },
          { label: "System Settings", desc: "Modify platform configuration" },
        ],
      },
      notifications: {
        title: "Notification Settings",
        event: "Event",
        email: "Email",
        inApp: "In-App",
        saveBtn: "Save Notifications",
        events: [
          { label: "New User Registration", desc: "When a new account is created" },
          { label: "JD Generation", desc: "When questions are generated" },
          { label: "Session Export", desc: "When a session is exported" },
          { label: "Suspicious Login", desc: "Unusual login activity detected" },
          { label: "Quota Warning", desc: "User approaching daily JD limit" },
          { label: "System Errors", desc: "Critical platform errors" },
        ],
      },
    },
  },
};

export type Translations = typeof en;
