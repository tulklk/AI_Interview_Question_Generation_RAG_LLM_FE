export interface BillingRecord {
  id: string;
  date: string;
  amount: string;
  invoiceNumber: string;
}

export interface UsageStat {
  id: string;
  label: string;
  current: number;
  max: number;
}

export interface NotificationPref {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export type SettingsTab =
  | "profile"
  | "preferences"
  | "notifications"
  | "security"
  | "billing";
