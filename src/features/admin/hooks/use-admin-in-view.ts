"use client";

import { useContext, useRef } from "react";
import { useInView } from "framer-motion";
import { AdminScrollContext } from "@/features/admin/context/admin-scroll-context";

export function useAdminInView(amount: number | "all" | "some" = 1) {
  const ref = useRef<HTMLDivElement>(null);
  const root = useContext(AdminScrollContext);
  const isInView = useInView(ref, { once: true, root, amount });
  return { ref, isInView };
}
