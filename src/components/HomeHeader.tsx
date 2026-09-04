"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PLATFORM_ITEMS } from "@/components/PlatformMenu";

const CLOSE_DELAY_MS = 180;

const HOME_ITEMS = [{ name: "Home", href: "/" }, ...PLATFORM_ITEMS];

/**
 * The homepage's only header: a small top-left logo, no visible nav bar.
 * Hovering (or focusing, for keyboard users) the logo reveals a nav panel
 * anchored to it — reuses MarketingNav's exact hover/click/outside-click/
 * Escape reconciliation logic (same CLOSE_DELAY_MS debounce, same
 * openedByHoverRef guard against a click's own preceding mouseenter
 * immediately re-closing it), just against a single panel instead of a
 * toggle button. Homepage-only by design — MarketingNav (used by /faq,
 * /terms, /privacy, /trust) is untouched.
 */
export function HomeHeader() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedByHoverRef = useRef(false);

  function cancelClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openPanel() {
    cancelClose();
    setOpen((wasOpen) => {
      if (!wasOpen) openedByHoverRef.current = true;
      return true;
    });
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      openedByHoverRef.current = false;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }

  function toggle(e: React.MouseEvent) {
    cancelClose();
    if (openedByHoverRef.current) {
      openedByHoverRef.current = false;
      return;
    }
    e.preventDefault();
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        openedByHoverRef.current = false;
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        openedByHoverRef.current = false;
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => cancelClose, []);

  return (
    <header className="fixed top-0 left-0 z-50 p-6 md:p-8">
      <div
        ref={wrapRef}
        className={`relative inline-block${open ? " home-nav-open" : ""}`}
        onMouseEnter={openPanel}
        onMouseLeave={scheduleClose}
        onFocus={openPanel}
        onBlur={(e) => {
          if (!wrapRef.current?.contains(e.relatedTarget as Node)) scheduleClose();
        }}
      >
        <Link
          ref={triggerRef}
          href="/"
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls="home-nav-panel"
          aria-label="MENTA — open navigation"
          onClick={toggle}
          className="home-logo-trigger"
        >
          <Image src="/logo.png" alt="MENTA" width={863} height={194} className="h-5 w-auto" priority />
        </Link>

        <nav
          id="home-nav-panel"
          aria-label="Platform"
          className={`home-nav-panel${open ? " home-nav-panel-open" : ""}`}
        >
          {HOME_ITEMS.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              tabIndex={open ? 0 : -1}
              className="home-nav-item"
              style={{ transitionDelay: open ? `${i * 35}ms` : "0ms" }}
              onClick={() => setOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
