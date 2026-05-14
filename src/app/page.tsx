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
import { FloatingWidgets } from "@/components/guest/floating-widgets";

export default function RootPage() {
  return (
    <main className="relative overflow-x-hidden">
      {/* ── Soft dual-gradient background (slow crossfade) + orbs ── */}
      <div
        className="animated-bg-stack fixed inset-0 z-0 pointer-events-none isolate"
        aria-hidden="true"
      >
        <div className="animated-bg-layer animated-bg-layer--a" />
        <div className="animated-bg-layer animated-bg-layer--b" />
      </div>

      <div
        className="fixed inset-0 z-0 pointer-events-none isolate"
        aria-hidden="true"
      >
        <div
          className="holo-orb holo-orb--purple"
          style={{ width: 560, height: 560, top: "-6%", left: "-8%" }}
        />
        <div
          className="holo-orb holo-orb--blue"
          style={{ width: 480, height: 480, top: "32%", right: "-6%" }}
        />
        <div
          className="holo-orb holo-orb--pink"
          style={{ width: 420, height: 420, top: "62%", left: "5%" }}
        />
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10">
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
        <FloatingWidgets />
      </div>
    </main>
  );
}
