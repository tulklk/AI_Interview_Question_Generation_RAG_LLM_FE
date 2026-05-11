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
    <main className="relative overflow-hidden">
      {/* ── Continuously color-shifting background (fixed, full viewport) ── */}
      <div
        className="animated-bg fixed inset-0 z-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* ── Floating glow orbs layered on top of the gradient ── */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        {/* Large purple orb — top-left */}
        <div
          className="holo-orb holo-orb--purple"
          style={{ width: 700, height: 700, top: "-8%", left: "-10%" }}
        />
        {/* Blue orb — mid-right */}
        <div
          className="holo-orb holo-orb--blue"
          style={{ width: 550, height: 550, top: "28%", right: "-8%" }}
        />
        {/* Pink orb — bottom-left */}
        <div
          className="holo-orb holo-orb--pink"
          style={{ width: 500, height: 500, top: "58%", left: "3%" }}
        />
        {/* Cyan orb — bottom-right */}
        <div
          className="holo-orb holo-orb--cyan"
          style={{ width: 450, height: 450, top: "72%", right: "8%" }}
        />
        {/* Indigo orb — center */}
        <div
          className="holo-orb holo-orb--indigo"
          style={{ width: 400, height: 400, top: "12%", left: "42%" }}
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
