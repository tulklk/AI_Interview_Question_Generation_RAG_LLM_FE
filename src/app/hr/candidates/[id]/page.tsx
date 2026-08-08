"use client";

import { use } from "react";
import { HrCandidateOverviewPage } from "@/features/hr/components/candidates/hr-candidate-overview";

/** SCRUM-398: HR xem overview ứng viên. */
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <HrCandidateOverviewPage candidateUserId={id} />;
}
