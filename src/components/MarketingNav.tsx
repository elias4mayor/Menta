"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 transition-[padding,background-color,border-color] duration-300"
      style={{
        padding: scrolled ? "14px 24px" : "22px 24px",
        background: scrolled ? "rgba(8,8,10,0.78)" : "rgba(8,8,10,0.4)",
        backdropFilter: "blur(20px) saturate(140%)",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
      }}
    >
      <Link href="/" className="flex items-center">
        <Image src="/logo.png" alt="MENTA" width={863} height={194} className="h-7 w-auto" priority />
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/faq" className="hidden sm:inline text-sm text-text-2 hover:text-text-1 transition-colors">
          FAQ
        </Link>
        <Link href="/login" className="text-sm text-text-2 hover:text-text-1 transition-colors">
          Log in
        </Link>
        <Link href="/signup" className="btn-primary">
          Join Beta
        </Link>
      </nav>
    </header>
  );
}
