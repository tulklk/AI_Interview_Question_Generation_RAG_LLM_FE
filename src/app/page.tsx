import { GuestNavbar } from "@/components/guest/guest-navbar";
import { HeroSection } from "@/components/guest/hero-section";
import { BenefitsSection } from "@/components/guest/benefits-section";
import { FeaturesSection } from "@/components/guest/features-section";
import { WorkflowSection } from "@/components/guest/workflow-section";
import { PricingSection } from "@/components/guest/pricing-section";
import { DemoPreviewSection } from "@/components/guest/demo-preview-section";
import { TestimonialsSection } from "@/components/guest/testimonials-section";
import { FinalCtaSection } from "@/components/guest/final-cta-section";
import { GuestFooter } from "@/components/guest/guest-footer";

export default function RootPage() {
  return (
    <main className="bg-white">
      <GuestNavbar />
      <HeroSection />
      <BenefitsSection />
      <FeaturesSection />
      <WorkflowSection />
      <DemoPreviewSection />
      <PricingSection />
      <TestimonialsSection />
      <FinalCtaSection />
      <GuestFooter />
    </main>
  );
}
