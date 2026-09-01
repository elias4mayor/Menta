"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PlatformDropdown } from "@/components/PlatformMenu";

const CLOSE_DELAY_MS = 180;

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoWrapRef = useRef<HTMLDivElement>(null);
  const platformTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // A real mouse click always fires `mouseenter` immediately before `click`
  // (the cursor has to land on the element to click it). Without this flag,
  // that mouseenter's openPlatform() would already flip the menu open, and
  // the click's toggle would immediately flip it back closed — clicking the
  // caret would look like it does nothing. Track "this open was just caused
  // by hover" so the very next click treats it as a no-op instead of a
  // close, while a click with no preceding hover (keyboard activation, or a
  // second tap after the ghost-hover has settled) still toggles normally.
  const openedByHoverRef = useRef(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function cancelClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openPlatform() {
    cancelClose();
    setPlatformOpen((wasOpen) => {
      if (!wasOpen) openedByHoverRef.current = true;
      return true;
    });
  }

  // Debounced close so moving the pointer from the logo, through the small
  // gap, into the dropdown doesn't close it — only closes if the pointer
  // hasn't re-entered either region within CLOSE_DELAY_MS.
  function scheduleClosePlatform() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      openedByHoverRef.current = false;
      setPlatformOpen(false);
    }, CLOSE_DELAY_MS);
  }

  function togglePlatform() {
    cancelClose();
    if (openedByHoverRef.current) {
      // This click's own preceding mouseenter is what opened it — leave it open.
      openedByHoverRef.current = false;
      return;
    }
    setPlatformOpen((o) => !o);
  }

  // Close on outside click / Escape.
  useEffect(() => {
    if (!platformOpen) return;

    function onPointerDown(e: MouseEvent) {
      if (!logoWrapRef.current?.contains(e.target as Node)) {
        openedByHoverRef.current = false;
        setPlatformOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        openedByHoverRef.current = false;
        setPlatformOpen(false);
        platformTriggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [platformOpen]);

  useEffect(() => cancelClose, []);

  // Escape closes the mobile menu too; lock body scroll while it's open.
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

  function closeAll() {
    setPlatformOpen(false);
    setMobileOpen(false);
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-end px-6 md:px-10 transition-[padding,background-color,border-color] duration-300 marketing-nav-material"
        style={{
          padding: scrolled ? "14px 24px" : "22px 24px",
          background: "rgba(255,255,255,0.78)",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        }}
      >
        {/* Centered logo + hover/tap Platform menu — absolutely positioned so it
            stays centered regardless of what's in the side nav groups. */}
        <div
          ref={logoWrapRef}
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
          onMouseEnter={openPlatform}
          onMouseLeave={scheduleClosePlatform}
        >
          <div className="flex items-center gap-1">
            <Link href="/" className="flex items-center" onClick={closeAll}>
              <Image
                src="/logo.png"
                alt="MENTA"
                width={863}
                height={194}
                className="h-9 w-auto"
                style={{ filter: "invert(1)" }}
                priority
              />
            </Link>
            <button
              ref={platformTriggerRef}
              type="button"
              aria-haspopup="true"
              aria-expanded={platformOpen}
              aria-controls="platform-menu"
              aria-label="Platform menu"
              onClick={togglePlatform}
              className="text-text-3 hover:text-text-1 transition-colors p-1"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{
                  transform: platformOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s var(--ease)",
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <PlatformDropdown
            id="platform-menu"
            open={platformOpen}
            onMouseEnter={openPlatform}
            onMouseLeave={scheduleClosePlatform}
          />
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/membership" className="text-sm text-text-2 hover:text-text-1 transition-colors">
            Memberships
          </Link>
          <Link href="/faq" className="text-sm text-text-2 hover:text-text-1 transition-colors">
            FAQ
          </Link>
          <Link href="/login" className="text-sm text-text-2 hover:text-text-1 transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Join Beta
          </Link>
        </nav>

        <button
          ref={mobileTriggerRef}
          type="button"
          aria-haspopup="true"
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden text-text-1 p-1"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>

      {mobileOpen && (
        <div
          id="mobile-menu"
          className="md:hidden fixed inset-0 z-40 pt-20 overflow-y-auto marketing-nav-material"
          style={{ background: "rgba(255,255,255,0.98)" }}
        >
          <div className="px-6 py-6 space-y-1">
            <Link href="/membership" onClick={closeAll} className="block py-3 text-base text-text-1">
              Memberships
            </Link>
            <Link href="/faq" onClick={closeAll} className="block py-3 text-base text-text-1">
              FAQ
            </Link>
            <Link href="/login" onClick={closeAll} className="block py-3 text-base text-text-1">
              Log in
            </Link>
            <Link href="/signup" onClick={closeAll} className="btn-primary w-full justify-center mt-4">
              Join Beta
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
