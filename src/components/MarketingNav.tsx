"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

// Flat top-level links — no dropdown/mega-menu, per the site's information
// architecture: the homepage stays short (hero + final CTA only), and each
// of these owns one focused, standalone page. "MENTA Safety" points at
// /menta-safety rather than the suggested /safety — /safety is already the
// real, authenticated MENTA Safety product page (src/app/(app)/safety),
// and a top-level /safety route here would collide with it at build time.
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/platform", label: "Platform" },
  { href: "/athletes", label: "Athletes" },
  { href: "/coaches", label: "Coaches" },
  { href: "/parents", label: "Parents" },
  { href: "/trainers", label: "Trainers" },
  { href: "/menta-safety", label: "MENTA Safety" },
  { href: "/about", label: "About" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the mobile menu; lock body scroll while it's open.
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        mobileTriggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-6 px-6 md:px-10 transition-[padding,background-color,border-color] duration-300 marketing-nav-material marketing-nav-bg"
        style={{
          padding: scrolled ? "14px 24px" : "22px 24px",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        <Link href="/" className="flex items-center shrink-0" onClick={closeMobile}>
          <Image src="/logo.png" alt="MENTA" width={863} height={194} className="h-8 w-auto marketing-nav-logo" priority />
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-text-2 hover:text-text-1 transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5 shrink-0">
          <Link href="/login" className="text-sm text-text-2 hover:text-text-1 transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Join the Beta
          </Link>
        </div>

        <button
          ref={mobileTriggerRef}
          type="button"
          aria-haspopup="true"
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((o) => !o)}
          className="lg:hidden text-text-1 p-1"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden fixed inset-0 z-40 pt-20 overflow-y-auto marketing-nav-material marketing-nav-mobile-bg"
        >
          <div className="px-6 py-6 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMobile} className="block py-3 text-base text-text-1">
                {link.label}
              </Link>
            ))}
            <div className="pt-4 mt-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <Link href="/login" onClick={closeMobile} className="block py-3 text-base text-text-1">
                Log in
              </Link>
              <Link href="/signup" onClick={closeMobile} className="btn-primary w-full justify-center mt-3">
                Join the Beta
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
