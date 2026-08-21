"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { DashboardHero } from "@/components/DashboardHero";
import { GlowWaveText } from "@/components/GlowWaveText";

const NAV_SECTIONS: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "Home",
    items: [
      { href: "/dashboard", label: "My MENTA" },
      { href: "/ai-coach", label: "MENTA AI" },
    ],
  },
  {
    label: "Development",
    items: [
      { href: "/train", label: "Training" },
      { href: "/performance", label: "Performance" },
      { href: "/film", label: "Film" },
      { href: "/recovery", label: "Recovery" },
      { href: "/mind", label: "Mindset" },
    ],
  },
  {
    label: "Future",
    items: [
      { href: "/school", label: "Academics" },
      { href: "/recruit", label: "Recruiting" },
      { href: "/safety", label: "Safety" },
    ],
  },
  {
    label: "Team",
    items: [
      { href: "/team", label: "Team" },
      { href: "/messages", label: "Messages" },
      { href: "/calendar", label: "Calendar" },
    ],
  },
  {
    label: "You",
    items: [
      { href: "/profile", label: "Profile" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

const MOBILE_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/ai-coach", label: "AI" },
  { href: "/team", label: "Team" },
  { href: "/messages", label: "Msgs" },
  { href: "/profile", label: "You" },
];

export function AppShell({
  user,
  unreadCount,
  children,
}: {
  user: { name: string; role: string };
  unreadCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-shell min-h-screen flex bg-bg">
      <aside
        className="hidden md:flex md:w-64 shrink-0 flex-col px-4 py-6"
        style={{ borderRight: "1px solid var(--border-soft)", background: "var(--sidebar-tint)" }}
      >
        <Link href="/dashboard" className="flex items-center px-2 mb-10">
          <Image
            src="/logo.png"
            alt="MENTA"
            width={863}
            height={194}
            className="h-6 w-auto"
            style={{ filter: "invert(1)" }}
            priority
          />
        </Link>
        <nav className="flex-1 space-y-7 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="mono text-text-3 px-3 mb-2">{section.label}</div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="relative block px-3 py-2 rounded-[var(--r-sm)] text-sm transition-all duration-300"
                      style={{
                        color: active ? "var(--text-1)" : "var(--text-2)",
                        background: active ? "var(--nav-hover-bg)" : "transparent",
                      }}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                          style={{ width: 3, height: 14, background: "var(--grad-signal)" }}
                        />
                      )}
                      {active ? (
                        <GlowWaveText intensity="subtle" hoverBoost={false}>
                          {item.label}
                        </GlowWaveText>
                      ) : (
                        item.label
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="pt-4 mt-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <div className="px-2 text-sm">{user.name}</div>
          <div className="px-2 mono text-text-3 mb-2">{user.role}</div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full text-left px-2 py-1.5 text-sm text-text-2 hover:text-text-1 transition-colors"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
          style={{
            borderBottom: "1px solid var(--border-soft)",
            background: "var(--topbar-bg)",
            backdropFilter: "blur(16px)",
          }}
        >
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/logo.png"
              alt="MENTA"
              width={863}
              height={194}
              className="h-5 md:h-6 w-auto"
              style={{ filter: "invert(1)" }}
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              className="relative text-text-2 hover:text-text-1 transition-colors"
              aria-label="Notifications"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{ background: "var(--grad-signal)", color: "var(--on-signal)", minWidth: 16, height: 16, padding: "0 4px" }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <div className="md:hidden text-sm text-text-2">{user.name.split(" ")[0]}</div>
          </div>
        </header>
        <main className="flex-1 px-6 py-8 pb-24 md:pb-8 flex justify-center">
          <div className="w-full max-w-6xl">
            {/* Rendered once here (not per-page) so navigating between dashboard
                pages doesn't remount it — the gallery keeps rotating in the same
                order instead of restarting on every click. */}
            <DashboardHero greeting={`Hey ${user.name.split(" ")[0]}.`} />
            {children}
          </div>
        </main>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-2"
        style={{
          borderTop: "1px solid var(--border-soft)",
          background: "var(--bottomnav-bg)",
          backdropFilter: "blur(16px)",
        }}
      >
        {MOBILE_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-2 py-1 text-xs transition-colors"
              style={{ color: active ? "var(--text-1)" : "var(--text-3)" }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
