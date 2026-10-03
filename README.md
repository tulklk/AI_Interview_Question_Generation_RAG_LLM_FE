# HireGen AI — Interview Question Generator

> AI-powered platform that generates tailored, role-specific interview questions from job descriptions, then lets candidates practice, get feedback, and follow an AI coaching plan.

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

**HireGen AI** is a Next.js 16 frontend for an interview platform powered by RAG + LLM. HR turns a job description into a question set, publishes it, and reviews candidates. Candidates practice, take hiring assessments, and follow an AI Coach plan built from their CV. Admins manage users, content, plans, and platform settings.

Signed-in roles:

- **HR** — `/hr`
- **Candidate** — `/candidate`
- **Admin** — `/admin`

Guests can open the landing page, sign in, and register. After login, the app sends each role to its own home (`/hr/dashboard`, `/candidate/dashboard`, `/admin/dashboard`).

---

## Features

### HR

- **Dashboard** — usage and activity for the signed-in recruiter
- **Generate questions** — create a set from a job description, or build questions manually
- **Question sets** — drafts, published sets, bookmarks, and published-set insights
- **Knowledge base** — company documents used when generating questions
- **Candidates** — recommendations, accepted candidates, and the talent pool
- **Settings** — profile, preferences, and subscription

### Candidate

- **Dashboard** — practice progress and readiness
- **Practice** — question sets from the marketplace, with a result page after each session
- **Jobs** — hiring assessments published by companies
- **AI Coach** — upload a CV, confirm a goal, then follow a diagnostic and practice roadmap
- **Saved, invitations, history** — bookmarked sets, company invites, and completed sessions
- **Settings** — profile and plan (Free / Premium), including usage limits

### Admin

- **Dashboard** — platform overview
- **Users** — search, filter, and inspect accounts
- **Marketplace** — published question sets
- **Knowledge base** — shared documents and roadmap material
- **Companies** — company records
- **Subscription plans** — plan limits
- **Feedback** — user feedback
- **Settings** — platform configuration

### Shared

- **English and Vietnamese** — switchable from the headers; choice is kept across visits
- **Google and GitHub sign-in**
- **Live plan updates** — subscription changes arrive over SignalR, with a periodic refresh as backup

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | React 19, TypeScript 5 |
| Styling | Tailwind CSS v4 |
| HTTP | Axios |
| Realtime | [@microsoft/signalr](https://learn.microsoft.com/aspnet/core/signalr/introduction) |
| Charts | [Recharts](https://recharts.org) |
| Motion | [Framer Motion](https://www.framer.com/motion/) |
| Icons | [lucide-react](https://lucide.dev) |
| i18n | Custom dictionaries (`en.ts` / `vi.ts`) |
| Deployment | [Vercel](https://vercel.com) (`vercel.json`) |

---

## Project Structure

```
src/
├── app/                  # App Router pages (hr, candidate, admin, auth, guest)
├── core/                 # API client, auth, env, i18n, interceptors, storage
├── features/             # Screens and domain logic by area
│   ├── admin/
│   ├── auth/
│   ├── candidate/
│   ├── dashboard/
│   ├── gamification/
│   ├── guest/
│   ├── hr/
│   ├── interview/
│   ├── knowledge/
│   ├── question/
│   ├── settings/
│   ├── studio/
│   └── subscription/
├── shared/               # Shared UI, providers, hooks, guards
└── lib/                  # cn() (clsx + tailwind-merge)
```

---

## Pages & Roles

| URL | Role | Description |
|-----|------|-------------|
| `/` | Guest | Landing page |
| `/login`, `/register` | Guest | Sign in and sign up |
| `/forgot-password`, `/reset-password`, `/verify-email` | Guest | Account recovery and email verification |
| `/privacy`, `/terms` | Guest | Legal pages |
| `/hr/dashboard` | HR | Recruiter home |
| `/hr/generate-question` | HR | Generate a question set |
| `/hr/history` | HR | Question sets (draft, published, bookmarked) |
| `/hr/published`, `/hr/published/[id]` | HR | Insights for a published set |
| `/hr/knowledge` | HR | Knowledge base |
| `/hr/candidate-recommendations` | HR | Recommended and accepted candidates |
| `/hr/talent` | HR | Talent pool |
| `/hr/settings` | HR | Account and subscription |
| `/candidate/dashboard` | Candidate | Practice home |
| `/candidate/practice`, `/candidate/practice/[id]` | Candidate | Browse and take a practice set |
| `/candidate/jobs`, `/candidate/jobs/[id]` | Candidate | Hiring assessments |
| `/candidate/coach` | Candidate | AI Coach |
| `/candidate/saved` | Candidate | Saved sets |
| `/candidate/invitations` | Candidate | Company invitations |
| `/candidate/history` | Candidate | Completed sessions |
| `/candidate/settings` | Candidate | Profile and billing |
| `/admin/dashboard` | Admin | Platform overview |
| `/admin/users` | Admin | User management |
| `/admin/marketplace` | Admin | Marketplace |
| `/admin/knowledge` | Admin | Knowledge base |
| `/admin/companies` | Admin | Companies |
| `/admin/plans` | Admin | Subscription plans |
| `/admin/feedbacks` | Admin | Feedback |
| `/admin/settings` | Admin | Platform settings |

Older HR links still redirect: `/dashboard` → `/hr/dashboard`, `/generate` → `/hr/generate-question`, `/history` → `/hr/history`, `/settings` → `/hr/settings`. `/admin/analytics`, `/admin/content`, and `/admin/audit` redirect to `/admin/dashboard`.

`trailingSlash` is enabled, so a path such as `/login` is served as `/login/`.

---

## Internationalization (i18n)

The UI is **English** and **Vietnamese**.

1. Dictionaries live in [`src/core/i18n/en.ts`](src/core/i18n/en.ts) and [`src/core/i18n/vi.ts`](src/core/i18n/vi.ts). `Translations` is `typeof en`, so both files must expose the same keys.
2. [`src/shared/providers/language-context.tsx`](src/shared/providers/language-context.tsx) exposes `useLanguage()` as `{ t, lang, setLang }`.
3. The selected language is stored in `localStorage` and a cookie named `hiregena-lang`, so the server render can match the last choice.

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

Copy [`.env.example`](.env.example) to `.env.local` and set the API URL before starting the app.

### Development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run dev:clean` | Delete `.next`, then start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |

---

## Build & Deploy

```bash
npm run build
```

The repo includes [`vercel.json`](vercel.json) with the Next.js preset and `npm run build`.

| Setting | Value |
|---------|-------|
| Framework preset | `Next.js` |
| Build command | `npm run build` |
| Node.js version | `20` |

1. Push the repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Add the variables from `.env.example` under **Settings → Environment Variables**.
4. Deploy. Pushes to the connected branch create a new deployment.

```bash
npx vercel          # preview
npx vercel --prod   # production
```

---

## Environment

Copy `.env.example` to `.env.local`. Do not commit `.env*` files.

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API. No trailing slash. |
| `NEXT_PUBLIC_RAG_BASE_URL` | RAG / LLM service. No trailing slash. |
| `NEXT_PUBLIC_RAG_API_KEY` | Key for the RAG service, when required. |
| `NEXT_PUBLIC_AUTH_REFRESH_PATH` | Refresh-token path, relative to the API base URL. |
| `NEXT_PUBLIC_APP_LOGIN_PATH` | Where to send the user when the session cannot be refreshed. |

---

## License

This project is part of **SEP490** — Software Engineering Capstone at FPT University.
