/**
 * Centralized API endpoint paths. Components/services must reference these
 * constants instead of hard-coding URL strings.
 */

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/api/auth/login",
    LOGOUT: "/api/auth/logout",
    REGISTER_HR: "/api/auth/register/hr",
    REGISTER_CANDIDATE: "/api/auth/register/candidate",
    RESEND_VERIFICATION: "/api/auth/resend-verification",
    VERIFY_EMAIL: "/api/auth/verify-email",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
    OAUTH_GOOGLE: "/api/auth/oauth/google",
    OAUTH_GOOGLE_VERIFY: "/api/auth/oauth/google/verify",
  },
  USER: {
    ME: "/api/users/me",
    CANDIDATE_PROFILE: "/api/users/me/candidate-profile",
    HR_PROFILE: "/api/users/me/hr-profile",
    CHANGE_PASSWORD: "/api/users/me/password",
  },
  ADMIN: {
    USERS: "/api/admin/users",
  },
  COMPANY: {
    LIST: "/api/companies",
  },
  CANDIDATE: {
    QUESTION_SETS: "/api/candidate/question-sets",
  },
  PRACTICE_SESSIONS: {
    BASE: "/practice-sessions",
  },
  HR_QUESTION_SETS: {
    PUBLISH: (id: string) => `/api/hr/question-sets/${id}/publish`,
    UNPUBLISH: (id: string) => `/api/hr/question-sets/${id}/unpublish`,
  },
  KNOWLEDGE: {
    HR_FILES: "/api/rag/knowledge/hr/files",
  },
  RAG: {
    INTERVIEW_QUESTIONS: "/api/rag/interview-questions",
    PLAN_START: "/api/rag/interview-plans/start",
    PLAN_MESSAGES: "/api/rag/interview-plans/messages",
    PLAN_CONFIRM: "/api/rag/interview-plans/confirm",
  },
} as const;
