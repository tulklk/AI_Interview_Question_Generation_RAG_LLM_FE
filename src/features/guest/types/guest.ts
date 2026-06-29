import type { ComponentType } from "react";

export interface BenefitItem {
  id: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

export interface FeatureItem {
  id: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

export interface WorkflowStep {
  step: number;
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  avatarColor: string;
}

export interface DemoQuestion {
  id: string;
  category: "Technical" | "Behavioral" | "Situational";
  question: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  suggestedAnswer: string;
}
