"use client";

import { use } from "react";
import { HrSessionFeedbackPage } from "@/features/hr/components/candidates/hr-session-feedback";

export default function Page({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = use(params);
  return <HrSessionFeedbackPage candidateUserId={id} sessionId={sessionId} />;
}
