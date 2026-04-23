"use client";

import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ScrollReveal } from "@/components/shared/scroll-reveal";

export function GuestFooter() {
  const { t } = useLanguage();
  const f = t.footer;
  const nav = t.nav;

  const quickLinks = [
    { label: nav.features, href: "#features" },
    { label: nav.pricing, href: "#pricing" },
    { label: nav.contact, href: "#contact" },
    { label: t.common.login, href: "/login" },
  ];

  const legalLinks = [
    { label: f.privacy, href: "#" },
    { label: f.terms, href: "#" },
    { label: f.cookies, href: "#" },
  ];

  return (
    <footer id="contact" className="bg-white border-t border-gray-100">
      <ScrollReveal animation="fade-up" className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <BrandLogo className="mb-4" logoClassName="w-9 h-9" />
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{f.tagline}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">
              {f.quickLinks}
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("#") ? (
                    <a href={link.href} className="text-sm text-gray-500 hover:text-[#6c47ff] transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="text-sm text-gray-500 hover:text-[#6c47ff] transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">
              {f.legal}
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-gray-500 hover:text-[#6c47ff] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} HireGen AI. {f.copyright}
          </p>
          <p className="text-xs text-gray-400">{f.builtWith}</p>
        </div>
      </ScrollReveal>
    </footer>
  );
}
