"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useLanguage } from "@/context/language-context";
import { BrandLogo } from "@/components/shared/brand-logo";

export function GuestNavbar() {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: t.nav.home, href: "#home" },
    { label: t.nav.features, href: "#features" },
    { label: t.nav.pricing, href: "#pricing" },
    { label: t.nav.contact, href: "#contact" },
  ];

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white transition-shadow duration-200 animate-slide-down ${
        scrolled ? "shadow-sm border-b border-gray-100" : "border-b border-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 h-[72px] flex items-center gap-8">
        <BrandLogo
          className="shrink-0"
          logoClassName="w-11 h-11"
          titleClassName="text-[16px]"
          subtitleClassName="hidden"
        />

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 ml-auto">
          <LanguageSwitcher />
          <div className="w-px h-5 bg-gray-200" />
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-[#6c47ff] hover:bg-[#6c47ff]/5 rounded-lg transition-colors"
          >
            {t.common.login}
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-white bg-[#6c47ff] hover:bg-[#5535dd] rounded-lg transition-colors"
          >
            {t.common.getStarted}
          </Link>
        </div>

        <button
          className="md:hidden ml-auto p-2 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1 animate-fade-up">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <div className="flex justify-start px-1 pb-1">
              <LanguageSwitcher variant="light" />
            </div>
            <Link
              href="/login"
              className="block px-3 py-2.5 text-sm font-semibold text-center text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t.common.login}
            </Link>
            <Link
              href="/login"
              className="block px-3 py-2.5 text-sm font-semibold text-center text-white bg-[#6c47ff] hover:bg-[#5535dd] rounded-lg transition-colors"
            >
              {t.common.getStarted}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
