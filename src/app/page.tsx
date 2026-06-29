import { GuestNavbar } from "@/features/guest/components/guest-navbar";
import { HeroSection } from "@/features/guest/components/hero-section";
import { SectionCarousel } from "@/features/guest/components/section-carousel";
import { PricingSection } from "@/features/guest/components/pricing-section";
import { DemoPreviewSection } from "@/features/guest/components/demo-preview-section";
import { TestimonialsSection } from "@/features/guest/components/testimonials-section";
import { FinalCtaSection } from "@/features/guest/components/final-cta-section";
import { GuestFooter } from "@/features/guest/components/guest-footer";
import { FloatingWidgets } from "@/features/guest/components/floating-widgets";

export default function RootPage() {
  return (
    <main className="relative overflow-x-hidden">
      {/* ── Animated background: shifting gradient layers + aurora mesh ── */}
      <div
        className="animated-bg-stack fixed inset-0 z-0 pointer-events-none isolate"
        aria-hidden="true"
      >
        <div className="animated-bg-layer animated-bg-layer--a" />
        <div className="animated-bg-layer animated-bg-layer--b" />
        <div className="aurora-mesh" />
        <div className="bg-grid-pattern" />
      </div>

      {/* ── Floating holo orbs ── */}
      <div
        className="fixed inset-0 z-0 pointer-events-none isolate"
        aria-hidden="true"
      >
        <div
          className="holo-orb holo-orb--purple"
          style={{ width: 580, height: 580, top: "-8%", left: "-10%" }}
        />
        <div
          className="holo-orb holo-orb--blue"
          style={{ width: 500, height: 500, top: "28%", right: "-8%" }}
        />
        <div
          className="holo-orb holo-orb--pink"
          style={{ width: 440, height: 440, top: "60%", left: "3%" }}
        />
        <div
          className="holo-orb holo-orb--teal"
          style={{ width: 380, height: 380, top: "12%", right: "22%" }}
        />
        <div
          className="holo-orb holo-orb--amber"
          style={{ width: 320, height: 320, top: "78%", right: "10%" }}
        />
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10">
        <GuestNavbar />
        <HeroSection />
        <SectionCarousel />
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
