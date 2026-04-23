# HireGen AI — Interview Question Generator

> AI-powered platform that generates tailored, role-specific interview questions from job descriptions.

![HireGen AI](public/images/logo.png)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Roles](#pages--roles)
- [Internationalization (i18n)](#internationalization-i18n)
- [Getting Started](#getting-started)
- [Build & Deploy](#build--deploy)
- [Environment](#environment)

---

## Overview

**HireGen AI** is a Next.js 16 frontend application for an AI-powered interview question generation platform. Recruiters paste a Job Description (JD), configure question parameters, and the system generates categorized interview questions (Technical, Behavioral, Situational, Cultural, Leadership) powered by RAG + LLM.

The application supports **two user roles**:
- **HR Manager (Recruiter)** — generate, review, export interview questions
- **Admin** — platform-wide management: users, analytics, content, settings

---

## Features

### HR Manager
- **Landing Page** — public-facing homepage with features, pricing, workflow, testimonials, and AI chat widget
- **Authentication** — login page with branded UI
- **Dashboard** — stats overview, weekly activity chart, category breakdown, recent sessions
- **Generate Questions** — paste JD text or upload file, configure role/level/category/count, track generation progress
- **History** — browse past sessions, filter by role/level, view detailed results
- **Results** — view generated questions by tab (Technical / Behavioral / Situational), extracted keywords, copy/export actions
- **Settings** — profile, preferences, notifications, security, billing

### Admin
- **Admin Dashboard** — platform-wide stats, user growth chart, questions trend chart, system activity log
- **User Management** — list, search/filter users; add/edit users via modal; role & status badges
- **System Analytics** — weekly usage chart, question category distribution, user role distribution
- **Generated Content** — browse all sessions across all recruiters, filter by role/date range
- **Admin Settings** — general config, AI model configuration, user permissions matrix, notification rules

### Cross-cutting
- **Bilingual (EN / VI)** — full website translation switchable from any header; persisted via `localStorage`
- **Animations** — scroll-reveal entrance animations, fade/slide/float effects via custom CSS `@keyframes`
- **Floating Widgets** — scroll-to-top button + AI chat panel with suggested questions
- **Responsive Layout** — sidebar + top header shell for authenticated pages
- **Be Vietnam Pro** font applied globally

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Icons | [lucide-react](https://lucide.dev) |
| Charts | [Recharts](https://recharts.org) |
| Font | [Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro) via `next/font/google` |
| State | React Context API (`LanguageContext`) |
| i18n | Custom dictionary-based (`en.ts` / `vi.ts`) |
| Deployment | Cloudflare Pages (static export) |

---

## Project Structure

```
src/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Guest Landing Page (/)
│   ├── login/                  # /login
│   ├── dashboard/              # /dashboard
│   ├── generate/               # /generate
│   ├── history/
│   │   └── [id]/               # /history/:id — Results page
│   ├── settings/               # /settings
│   └── admin/
│       ├── dashboard/          # /admin/dashboard
│       ├── users/              # /admin/users
│       ├── analytics/          # /admin/analytics
│       ├── content/            # /admin/content
│       └── settings/           # /admin/settings
│
├── components/
│   ├── admin/                  # Admin-only components
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── analytics/
│   │   ├── content/
│   │   ├── settings/
│   │   └── layout/             # AdminAppShell, AdminSidebar
│   ├── auth/                   # LoginForm, LoginHero
│   ├── dashboard/              # StatCard, StatsGrid, Charts, RecentSessions
│   ├── generate/               # JdInputCard, FileUploadArea, ConfigSection, Progress
│   ├── guest/                  # Landing page sections + FloatingWidgets
│   ├── history/                # HistoryTable, HistoryFilters, HistoryStats
│   ├── layout/                 # AppShell, Sidebar, TopHeader
│   ├── results/                # QuestionCard, QuestionsTabs, KeywordsCard, ResultsHeader
│   ├── settings/               # ProfileSection, SecuritySection, BillingSection, ...
│   ├── shared/                 # BrandLogo, LanguageSwitcher, ScrollReveal, SearchInput
│   └── ui/                     # FormField, SelectField, Toggle
│
├── context/
│   └── language-context.tsx    # Global LanguageContext + useLanguage() hook
│
├── data/                       # Mock data (dashboard, generate, history, results, admin)
├── lib/
│   ├── i18n/
│   │   ├── en.ts               # English translation dictionary
│   │   └── vi.ts               # Vietnamese translation dictionary
│   └── utils.ts                # cn() utility (clsx + tailwind-merge)
│
└── types/                      # TypeScript interfaces (dashboard, generate, history, results, admin, settings)
```

---

## Pages & Roles

| URL | Role | Description |
|-----|------|-------------|
| `/` | Guest | Landing page |
| `/login` | Guest | Login form |
| `/dashboard` | HR Manager | Overview stats & charts |
| `/generate` | HR Manager | Generate interview questions |
| `/history` | HR Manager | Past sessions list |
| `/history/[id]` | HR Manager | Results & question viewer |
| `/settings` | HR Manager | Account & preferences |
| `/admin/dashboard` | Admin | Platform-wide overview |
| `/admin/users` | Admin | User management |
| `/admin/analytics` | Admin | System analytics |
| `/admin/content` | Admin | All generated content |
| `/admin/settings` | Admin | Platform configuration |

---

## Internationalization (i18n)

The app supports **English** and **Vietnamese** via a custom React Context-based i18n system.

**How it works:**
1. `src/lib/i18n/en.ts` and `src/lib/i18n/vi.ts` contain all UI strings organized by page/section
2. `src/context/language-context.tsx` provides `useLanguage()` hook with `{ t, lang, setLang }`
3. `src/app/providers.tsx` wraps the app with `LanguageProvider`
4. Language choice is persisted to `localStorage` and applied on every page load
5. The `LanguageSwitcher` component appears in the guest navbar, HR header, and admin header

**i18n sections:**
- `nav`, `hero`, `benefits`, `features`, `workflow`, `pricing`, `testimonials`, `cta`, `footer` — Landing page
- `loginPage` — Authentication
- `dashboardPage`, `generatePage`, `historyPage`, `settingsPage`, `resultsPage` — HR Manager
- `adminPages.dashboard`, `.users`, `.analytics`, `.content`, `.settings` — Admin
- `adminSidebar`, `appShell`, `chatWidget`, `lang` — Shared UI

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation

```bash
git clone https://github.com/tulklk/AI_Interview_Question_Generation_RAG_LLM_FE.git
cd AI_Interview_Question_Generation_RAG_LLM_FE
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Routes to Explore

| Path | What you'll see |
|------|----------------|
| `http://localhost:3000` | Guest Landing Page |
| `http://localhost:3000/login` | Login Page |
| `http://localhost:3000/dashboard` | HR Dashboard |
| `http://localhost:3000/generate` | Question Generator |
| `http://localhost:3000/history` | Session History |
| `http://localhost:3000/history/1` | Results Viewer |
| `http://localhost:3000/settings` | Settings |
| `http://localhost:3000/admin/dashboard` | Admin Dashboard |

---

## Build & Deploy

### Production Build (Static Export)

```bash
npm run build
```

Generates a fully static site in the `out/` directory. All 22 pages are pre-rendered as static HTML.

### Cloudflare Pages

This project is configured for **Cloudflare Pages** deployment:

| Setting | Value |
|---------|-------|
| Framework preset | `Next.js (Static HTML Export)` |
| Build command | `npm run build` |
| Output directory | `out` |
| Node.js version | `20` |

Every push to `main` triggers an automatic rebuild and deployment.

---

## Environment

This is a **frontend-only** project using mock data. No environment variables are required for local development or static deployment.

When integrating with a real backend API, add a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=https://your-api-url.com
```

> `.env*` files are gitignored by default.

---

## License

This project is part of **SEP490** — Software Engineering Capstone at FPT University.
