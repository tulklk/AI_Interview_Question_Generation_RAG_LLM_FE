"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, LayoutDashboard, LogOut, ChevronDown } from "lucide-react";
import { LanguageSwitcher } from "@/shared/components/common/language-switcher";
import { ThemeToggle } from "@/shared/components/common/theme-toggle";
import { useLanguage } from "@/shared/providers/language-context";
import { BrandLogo } from "@/shared/components/common/brand-logo";
import { useUser } from "@/features/auth/context/user-context";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { getUserRole, getRoleRedirect } from "@/core/auth/permissions";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function UserAvatar({ avatarUrl, fullName, size = 32 }: { avatarUrl?: string | null; fullName: string; size?: number }) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={fullName}
        referrerPolicy="no-referrer"
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="text-[11px] font-bold text-violet-700 dark:text-violet-300 leading-none">
        {getInitials(fullName)}
      </span>
    </div>
  );
}

export function GuestNavbar() {
  const { t } = useLanguage();
  const { user, loading } = useUser();
  const { logout, loggingOut } = useLogout();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { label: t.nav.home, href: "#home" },
    { label: t.nav.features, href: "#features" },
    { label: t.nav.pricing, href: "#pricing" },
    { label: t.nav.contact, href: "#contact" },
  ];

  const [dashboardHref, setDashboardHref] = useState<string>("/login");
  useEffect(() => {
    if (user) {
      setDashboardHref(getRoleRedirect(user.role ?? getUserRole()));
    }
  }, [user]);

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const isLoggedIn = !loading && !!user;

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-white/80 dark:bg-[#070B1A]/70 transition-all duration-200 animate-slide-down border-b ${
          scrolled
            ? "backdrop-blur-lg shadow-sm border-gray-200/60 dark:border-[rgba(148,163,184,0.18)]"
            : "backdrop-blur-md border-[rgba(124,58,237,0.06)] dark:border-[rgba(148,163,184,0.1)]"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center gap-8">
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

            {isLoggedIn ? (
              /* User dropdown trigger */
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <UserAvatar avatarUrl={user.avatarUrl} fullName={user.fullName} />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 max-w-32 truncate">
                    {user.fullName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden z-50">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{user.fullName}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href={dashboardHref}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <LayoutDashboard size={15} className="text-gray-400 shrink-0" />
                        {t.common.goToDashboard}
                      </Link>

                      <button
                        type="button"
                        onClick={() => { setDropdownOpen(false); logout(); }}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                      >
                        <LogOut size={15} className="shrink-0" />
                        {t.common.logout}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !loading && (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-primary hover:bg-primary/5 dark:text-gray-300 dark:hover:text-[#a78bff] dark:hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    {t.common.login}
                  </Link>
                  <Link
                    href="/login"
                    className="btn-cta-primary shimmer-button px-4 py-2 text-sm font-semibold text-white rounded-lg"
                  >
                    {t.common.getStarted}
                  </Link>
                </>
              )
            )}
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

          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900">
                <UserAvatar avatarUrl={user.avatarUrl} fullName={user.fullName} size={36} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{user.fullName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <Link
                href={dashboardHref}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <LayoutDashboard size={15} className="text-gray-400 shrink-0" />
                {t.common.goToDashboard}
              </Link>
              <button
                type="button"
                onClick={() => { setMobileOpen(false); logout(); }}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
              >
                <LogOut size={15} className="shrink-0" />
                {t.common.logout}
              </button>
            </>
          ) : (
            !loading && (
              <>
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
              </>
            )
          )}
        </div>
      </div>
    </>
  );
}
