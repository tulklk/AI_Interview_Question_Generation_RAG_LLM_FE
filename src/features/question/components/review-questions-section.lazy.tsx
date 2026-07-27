"use client";

import dynamic from "next/dynamic";

// Pulls @dnd-kit and the ~700-line review/edit UI out of the initial page
// chunk for /hr/generate and /hr/history/[id] — only fetched once the user
// actually reaches the question-review step.
export const ReviewQuestionsSection = dynamic(
  () => import("./review-questions-section").then((m) => m.ReviewQuestionsSection),
  { ssr: false }
);
