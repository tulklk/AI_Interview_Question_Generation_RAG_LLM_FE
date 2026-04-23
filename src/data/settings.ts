import type { BillingRecord, UsageStat, NotificationPref } from "@/types/settings";

export const billingHistory: BillingRecord[] = [
  { id: "1", date: "Apr 1, 2026", amount: "$49.00", invoiceNumber: "#INV-2026-04" },
  { id: "2", date: "Mar 1, 2026", amount: "$49.00", invoiceNumber: "#INV-2026-03" },
  { id: "3", date: "Feb 1, 2026", amount: "$49.00", invoiceNumber: "#INV-2026-02" },
];

export const usageStats: UsageStat[] = [
  { id: "jds", label: "JDs Processed", current: 24, max: 100 },
  { id: "questions", label: "Questions Generated", current: 186, max: 500 },
  { id: "exports", label: "PDF Exports", current: 12, max: 50 },
];

export const defaultNotificationPrefs: NotificationPref[] = [
  {
    id: "generation-complete",
    label: "Question generation complete",
    description: "Receive an email when questions are generated for a job description",
    enabled: true,
  },
  {
    id: "weekly-summary",
    label: "Weekly activity summary",
    description: "Get a digest of your weekly usage and generated questions",
    enabled: true,
  },
  {
    id: "product-updates",
    label: "Product updates & new features",
    description: "Stay informed about new AI capabilities and improvements",
    enabled: false,
  },
  {
    id: "security-alerts",
    label: "Security & login alerts",
    description: "Get notified about suspicious login attempts or changes",
    enabled: true,
  },
];
