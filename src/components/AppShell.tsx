"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { DashboardHero } from "@/components/DashboardHero";
import { GlowWaveText } from "@/components/GlowWaveText";
import { Avatar } from "@/components/Avatar";
import { NavIcon } from "@/components/NavIcons";
import { AskMenta } from "@/components/AskMenta";
import { SportSwitcher } from "@/components/SportSwitcher";

type NavItem = { href: string; label: string; icon: string };
type NavSection = { label: string; items: NavItem[] };

/**
 * Nav is role-aware: the athlete list below is the original, unchanged
 * navigation. Coach/Trainer/Parent get a deliberately smaller list —
 * every link here points at a route that already exists and already
 * shows that role something real; pages that only make sense once
 * Phases 2-4 build out the coach/trainer/parent dashboards properly
 * (e.g. a trainer's own client/program tools) aren't linked yet rather
 * than pointing at an athlete-shaped page that would confuse them.
 */
function navSectionsForRole(role: string): NavSection[] {
  if (role === "COACH") {
    return [
      {
        label: "Home",
        items: [
          { href: "/dashboard", label: "My MENTA", icon: "home" },
          { href: "/ai-coach", label: "MENTA Coach AI", icon: "spark" },
        ],
      },
      {
        label: "Team",
        items: [
          { href: "/team", label: "Team", icon: "team" },
          { href: "/film", label: "Film", icon: "film" },
          { href: "/safety", label: "Safety", icon: "safety" },
          { href: "/school", label: "Academics", icon: "school" },
        ],
      },
      {
        label: "Communication",
        items: [
          { href: "/messages", label: "Messages", icon: "messages" },
          { href: "/calendar", label: "Calendar", icon: "calendar" },
        ],
      },
      {
        label: "You",
        items: [
          { href: "/documents", label: "Documents", icon: "documents" },
          { href: "/profile", label: "Profile", icon: "profile" },
          { href: "/settings", label: "Settings", icon: "settings" },
        ],
      },
    ];
  }

  if (role === "TRAINER") {
    return [
      {
        label: "Home",
        items: [
          { href: "/dashboard", label: "My MENTA", icon: "home" },
          { href: "/ai-coach", label: "MENTA Trainer AI", icon: "spark" },
        ],
      },
      {
        label: "Clients",
        items: [
          { href: "/team", label: "Groups", icon: "team" },
          { href: "/train", label: "Training", icon: "train" },
          { href: "/care/provider", label: "Care queue", icon: "safety" },
        ],
      },
      {
        label: "Communication",
        items: [
          { href: "/messages", label: "Messages", icon: "messages" },
          { href: "/calendar", label: "Calendar", icon: "calendar" },
        ],
      },
      {
        label: "You",
        items: [
          { href: "/documents", label: "Documents", icon: "documents" },
          { href: "/profile", label: "Profile", icon: "profile" },
          { href: "/settings", label: "Settings", icon: "settings" },
        ],
      },
    ];
  }

  if (role === "DOCTOR") {
    return [
      {
        label: "Home",
        items: [
          { href: "/dashboard", label: "My MENTA", icon: "home" },
          { href: "/ai-coach", label: "MENTA AI", icon: "spark" },
        ],
      },
      {
        label: "Care",
        items: [
          { href: "/care/provider", label: "Care queue", icon: "safety" },
          { href: "/team", label: "Teams", icon: "team" },
          { href: "/calendar", label: "Calendar", icon: "calendar" },
        ],
      },
      {
        label: "Communication",
        items: [{ href: "/messages", label: "Messages", icon: "messages" }],
      },
      {
        label: "You",
        items: [
          { href: "/documents", label: "Documents", icon: "documents" },
          { href: "/profile", label: "Profile", icon: "profile" },
          { href: "/settings", label: "Settings", icon: "settings" },
        ],
      },
    ];
  }

  if (role === "PARENT") {
    return [
      {
        label: "Home",
        items: [
          { href: "/dashboard", label: "My MENTA", icon: "home" },
          { href: "/ai-coach", label: "MENTA Family AI", icon: "spark" },
        ],
      },
      {
        label: "Athlete",
        items: [
          { href: "/safety", label: "Safety", icon: "safety" },
          { href: "/care", label: "Care", icon: "safety" },
          { href: "/calendar", label: "Calendar", icon: "calendar" },
        ],
      },
      {
        label: "Communication",
        items: [{ href: "/messages", label: "Messages", icon: "messages" }],
      },
      {
        label: "You",
        items: [
          { href: "/documents", label: "Documents", icon: "documents" },
          { href: "/profile", label: "Profile", icon: "profile" },
          { href: "/settings", label: "Settings", icon: "settings" },
        ],
      },
    ];
  }

  return [
    {
      label: "Home",
      items: [
        { href: "/dashboard", label: "My MENTA", icon: "home" },
        { href: "/ai-coach", label: "MENTA AI", icon: "spark" },
      ],
    },
    {
      label: "Development",
      items: [
        { href: "/train", label: "Training", icon: "train" },
        { href: "/performance", label: "Performance", icon: "performance" },
        { href: "/film", label: "Film", icon: "film" },
        { href: "/recovery", label: "Recovery", icon: "recovery" },
        { href: "/mind", label: "Mindset", icon: "mind" },
      ],
    },
    {
      label: "Future",
      items: [
        { href: "/school", label: "Academics", icon: "school" },
        { href: "/recruit", label: "Recruiting", icon: "recruit" },
        { href: "/safety", label: "Safety", icon: "safety" },
      ],
    },
    {
      label: "Team",
      items: [
        { href: "/team", label: "Team", icon: "team" },
        { href: "/messages", label: "Messages", icon: "messages" },
        { href: "/calendar", label: "Calendar", icon: "calendar" },
      ],
    },
    {
      label: "You",
      items: [
        { href: "/documents", label: "Documents", icon: "documents" },
        { href: "/care", label: "Care", icon: "safety" },
        { href: "/profile", label: "Profile", icon: "profile" },
        { href: "/settings", label: "Settings", icon: "settings" },
      ],
    },
  ];
}

function mobileItemsForRole(role: string): { href: string; label: string; icon: string }[] {
  if (role === "COACH") {
    return [
      { href: "/dashboard", label: "Home", icon: "home" },
      { href: "/team", label: "Team", icon: "team" },
      { href: "/ai-coach", label: "AI", icon: "spark" },
      { href: "/messages", label: "Msgs", icon: "messages" },
      { href: "/profile", label: "You", icon: "profile" },
    ];
  }
  if (role === "TRAINER") {
    return [
      { href: "/dashboard", label: "Home", icon: "home" },
      { href: "/team", label: "Groups", icon: "team" },
      { href: "/ai-coach", label: "AI", icon: "spark" },
      { href: "/messages", label: "Msgs", icon: "messages" },
      { href: "/profile", label: "You", icon: "profile" },
    ];
  }
  if (role === "PARENT") {
    return [
      { href: "/dashboard", label: "Home", icon: "home" },
      { href: "/ai-coach", label: "AI", icon: "spark" },
      { href: "/messages", label: "Msgs", icon: "messages" },
      { href: "/calendar", label: "Cal", icon: "calendar" },
      { href: "/profile", label: "You", icon: "profile" },
    ];
  }
  if (role === "DOCTOR") {
    return [
      { href: "/dashboard", label: "Home", icon: "home" },
      { href: "/care/provider", label: "Care", icon: "safety" },
      { href: "/team", label: "Teams", icon: "team" },
      { href: "/messages", label: "Msgs", icon: "messages" },
      { href: "/profile", label: "You", icon: "profile" },
    ];
  }
  return [
    { href: "/dashboard", label: "Home", icon: "home" },
    { href: "/ai-coach", label: "AI", icon: "spark" },
    { href: "/team", label: "Team", icon: "team" },
    { href: "/messages", label: "Msgs", icon: "messages" },
    { href: "/profile", label: "You", icon: "profile" },
  ];
}

// Computed client-side only (useEffect, not during render) so the server-
// rendered HTML and the client's first render always match — Date().getHours()
// reads whichever timezone the code runs in, so doing this during render
// would use the server's timezone on first paint and the visitor's real
// timezone after hydration, a guaranteed mismatch for anyone not in the
// server's timezone. Starts as the timezone-agnostic "Hey" and swaps to a
// time-aware greeting once mounted client-side.
function useTimeOfDayGreeting(): string {
  const [greeting, setGreeting] = useState("Hey");
  useEffect(() => {
    const timer = setTimeout(() => {
      const hour = new Date().getHours();
      setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return greeting;
}

export function AppShell({
  user,
  unreadCount,
  children,
}: {
  user: { id: string; name: string; role: string };
  unreadCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const greeting = useTimeOfDayGreeting();
  const navSections = navSectionsForRole(user.role);
  const mobileItems = mobileItemsForRole(user.role);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-shell min-h-screen flex bg-bg">
      <aside
        className="hidden md:flex md:w-64 shrink-0 flex-col px-4 py-6 dash-in dash-in-1"
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
        <nav className="flex-1 space-y-6 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label} className="nav-section">
              <div className="mono text-text-3 px-3 mb-2.5" style={{ opacity: 0.75 }}>
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`nav-rail-item relative flex items-center gap-2.5 px-3 py-2 rounded-full text-sm active:scale-[0.97]${active ? "" : " nav-rail-item-idle"}`}
                      style={{
                        color: active ? "var(--text-1)" : "var(--text-2)",
                        background: active ? "var(--nav-hover-bg)" : "transparent",
                      }}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 rounded-full nav-dot-in"
                          style={{ width: 3, height: 14, background: "var(--grad-signal)" }}
                        />
                      )}
                      <NavIcon name={item.icon} className="shrink-0" />
                      {active ? (
                        <GlowWaveText intensity="subtle" hoverBoost={false}>
                          {item.label}
                        </GlowWaveText>
                      ) : (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="pt-4 mt-4" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <div className="flex items-center gap-2 px-2 mb-2">
            <Avatar userId={user.id} name={user.name} size={28} />
            <div>
              <div className="text-sm">{user.name}</div>
              <div className="mono text-text-3">{user.role}</div>
            </div>
          </div>
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
          className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 dash-in dash-in-2 topbar-material chrome-edge-bottom"
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
            <SportSwitcher role={user.role} />
            <Link
              href="/notifications"
              className="relative text-text-2 hover:text-text-1 transition-colors active:scale-90"
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
            <DashboardHero greeting={`${greeting}, ${user.name.split(" ")[0]}.`} />
            {children}
          </div>
        </main>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around py-2 bottomnav-material chrome-edge-top"
      >
        {mobileItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-2 py-1 text-xs transition-colors active:scale-95"
              style={{ color: active ? "var(--text-1)" : "var(--text-3)" }}
            >
              <NavIcon name={item.icon} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <AskMenta />
    </div>
  );
}
