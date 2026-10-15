"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useId } from "react";
import type { ReactNode } from "react";
import { DashboardHero } from "@/components/DashboardHero";
import { Avatar } from "@/components/Avatar";
import { NavIcon } from "@/components/NavIcons";
import { MENTAIsland } from "@/components/MENTAIsland";
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
          { href: "/train", label: "Training", icon: "train" },
          { href: "/train/exercises", label: "Exercise Library", icon: "train" },
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
          { href: "/train/exercises", label: "Exercise Library", icon: "train" },
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
        { href: "/train/exercises", label: "Exercise Library", icon: "train" },
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

function WorkspaceNavigation({ sections, pathname, onNavigate }: {
  sections: NavSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const activeHref = sections.flatMap((section) => section.items)
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return <nav className="workspace-navigation" aria-label="Workspace navigation">
    {sections.map((section, index) => {
      const containsActive = section.items.some((item) => item.href === activeHref);
      const stateKey = `${section.label}:${containsActive}`;
      const open = expanded[stateKey] ?? (containsActive || section.label === "Home");
      const panelId = `${id}-${index}`;
      return <section className="workspace-nav-group" key={section.label}>
        <button type="button" className="workspace-nav-toggle" aria-expanded={open} aria-controls={panelId}
          onClick={() => setExpanded((current) => ({ ...current, [stateKey]: !open }))}>
          <span>{section.label}</span>
          <svg className={open ? "is-open" : ""} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
        </button>
        <div id={panelId} hidden={!open} className="workspace-nav-links">
          {section.items.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate}
            aria-current={activeHref === item.href ? "page" : undefined}
            className={`workspace-nav-link${activeHref === item.href ? " is-active" : ""}`}>
            <NavIcon name={item.icon} className="shrink-0" /><span>{item.label}</span>
            {activeHref === item.href ? <span className="workspace-active-dot" aria-hidden="true" /> : null}
          </Link>)}
        </div>
      </section>;
    })}
  </nav>;
}

export function AppShell({ user, unreadCount, children }: {
  user: { id: string; name: string; role: string };
  unreadCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const drawer = useRef<HTMLDialogElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const greeting = useTimeOfDayGreeting();
  const navSections = navSectionsForRole(user.role);
  const mobileItems = mobileItemsForRole(user.role).slice(0, 4);
  const currentSection = navSections.find((section) => section.items.some((item) => pathname === item.href));
  const currentItem = navSections.flatMap((section) => section.items)
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Unable to sign out. Please try again.");
      router.push("/");
      router.refresh();
    } catch {
      setLogoutError("Unable to sign out. Please try again.");
      setLoggingOut(false);
    }
  }

  const account = <div className="workspace-account">
    <Link href="/profile" className="workspace-account-profile" onClick={() => drawer.current?.close()}>
      <Avatar userId={user.id} name={user.name} size={34} />
      <span><strong>{user.name}</strong><small>{user.role.toLowerCase()}</small></span>
      <NavIcon name="profile" />
    </Link>
    <div className="workspace-account-actions">
      <Link href="/settings" onClick={() => drawer.current?.close()}>Settings</Link>
      <button type="button" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Signing out…" : "Sign out"}</button>
    </div>
    {logoutError ? <p role="alert">{logoutError}</p> : null}
  </div>;

  return (
    <div className="app-shell workspace-shell">
      <a href="#workspace-content" className="workspace-skip">Skip to content</a>
      <aside className="workspace-sidebar" aria-label="Main sidebar">
        <Link href="/dashboard" className="workspace-brand"><Image src="/logo.png" alt="MENTA" width={863} height={194} priority /><span>Athlete operating system</span></Link>
        <WorkspaceNavigation sections={navSections} pathname={pathname} />
        <Link href="/ai-coach" className="workspace-ai-entry"><NavIcon name="spark" /><span>Ask MENTA<small>Find your next step</small></span><span aria-hidden="true">↗</span></Link>
        {account}
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="workspace-breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{currentSection?.label ?? currentItem?.label ?? "My MENTA"}</strong></div>
          <Link href="/dashboard" className="workspace-mobile-brand"><Image src="/logo.png" alt="MENTA" width={863} height={194} /></Link>
          <div className="workspace-topbar-actions">
            <SportSwitcher role={user.role} />
            <Link href="/notifications" className="workspace-icon-button" aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10 21h4" /></svg>
              {unreadCount > 0 ? <span className="workspace-notification-dot" /> : null}
            </Link>
            <Link href="/profile" className="workspace-topbar-avatar" aria-label="Your profile"><Avatar userId={user.id} name={user.name} size={30} /></Link>
          </div>
        </header>
        <main id="workspace-content" className="workspace-main" tabIndex={-1}>
          <div className="workspace-content">
            {pathname === "/dashboard" ? <DashboardHero greeting={`${greeting}, ${user.name.split(" ")[0]}.`} /> : null}
            {children}
          </div>
        </main>
      </div>
      <nav className="workspace-bottomnav" aria-label="Quick navigation">
        {mobileItems.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}><NavIcon name={item.icon} /><span>{item.label}</span></Link>)}
        <button type="button" onClick={() => drawer.current?.showModal()} aria-haspopup="dialog"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg><span>More</span></button>
      </nav>
      <dialog className="workspace-drawer" ref={drawer} aria-label="All workspace sections">
        <div className="workspace-drawer-header"><strong>Your workspace</strong><button type="button" className="workspace-icon-button" onClick={() => drawer.current?.close()} aria-label="Close navigation">✕</button></div>
        <WorkspaceNavigation sections={navSections} pathname={pathname} onNavigate={() => drawer.current?.close()} />
        {account}
      </dialog>
      <MENTAIsland user={user} unreadCount={unreadCount} />
    </div>
  );
}
