import type { ComponentType } from "react";

export interface JobRole {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
}

export interface ExperienceLevel {
  id: string;
  label: string;
}

export interface QuestionCountOption {
  value: number;
  label: string;
}

export type GenerateView = "form" | "generating";
