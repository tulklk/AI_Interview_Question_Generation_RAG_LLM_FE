"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/shared/components/common/language-switcher";
import { ThemeToggle } from "@/shared/components/common/theme-toggle";
import { useLanguage } from "@/shared/providers/language-context";
import { BrandLogo } from "@/shared/components/common/brand-logo";

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-white/80 dark:bg-[#070B1A]/70 transition-all duration-200 animate-slide-down border-b ${
          scrolled
            ? "backdrop-blur-lg shadow-sm border-gray-200/60 dark:border-[rgba(148,163,184,0.18)]"
            : "backdrop-blur-md border-[rgba(124,58,237,0.06)] dark:border-[rgba(148,163,184,0.1)]"
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
                className="nav-link-glow px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-[#7C3AED] hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <LanguageSwitcher />
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-[#6c47ff] hover:bg-[#6c47ff]/5 dark:text-gray-300 dark:hover:text-[#a78bff] dark:hover:bg-[#6c47ff]/10 rounded-lg transition-colors"
            >
              {t.common.login}
            </Link>
            <Link
              href="/login"
              className="btn-cta-primary shimmer-button px-4 py-2 text-sm font-semibold text-white rounded-lg"
            >
              {t.common.getStarted}
            </Link>
          </div>

          <button
            className="md:hidden ml-auto p-2 rounded-lg text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-60 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer panel — slides in from the right */}
      <div
        className={`md:hidden fixed top-0 right-0 z-70 h-full w-[82%] max-w-sm bg-white dark:bg-gray-950 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-18 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <BrandLogo logoClassName="w-9 h-9" titleClassName="text-[15px]" subtitleClassName="hidden" />
          <button
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-5 py-3.5 text-sm font-semibold text-gray-700 border-b border-gray-100 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-800 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <ThemeToggle variant="light" />
            <LanguageSwitcher variant="light" />
          </div>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 text-sm font-semibold text-center text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors"
          >
            {t.common.login}
          </Link>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="btn-cta-primary shimmer-button block px-3 py-2.5 text-sm font-semibold text-center text-white rounded-lg"
          >
            {t.common.getStarted}
          </Link>
        </div>
      </div>
    </>
  );
}
