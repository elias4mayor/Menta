"use client";

import Link from "next/link";

export type PlatformLink = { name: string; href: string; desc: string };
export type PlatformSection = { label: string; items: PlatformLink[] };

export const PLATFORM_SECTIONS: PlatformSection[] = [
  {
    label: "Core platform",
    items: [
      { name: "Training", href: "/train", desc: "Workout library and tracking" },
      { name: "Performance", href: "/performance", desc: "Stats, PRs, and trends" },
      { name: "Film", href: "/film", desc: "Upload, review, clip, and build highlight reels" },
      { name: "Recovery", href: "/recovery", desc: "Sleep, load, and wellness check-ins" },
      { name: "Mindset", href: "/mind", desc: "Mental performance and journaling" },
    ],
  },
  {
    label: "Academics & recruiting",
    items: [
      { name: "Academics", href: "/school", desc: "GPA tracking and eligibility" },
      { name: "Recruiting", href: "/recruit", desc: "Recruiting profile and outreach organizer" },
    ],
  },
  {
    label: "Safety & AI",
    items: [
      { name: "MENTA Safety", href: "/safety", desc: "Preparedness and emergency planning" },
      { name: "AI Coach", href: "/ai-coach", desc: "AI-powered athlete assistance" },
    ],
  },
];

/** Same 9 links, flattened — used by the single-column logo dropdown and the mobile menu. */
export const PLATFORM_ITEMS: PlatformLink[] = PLATFORM_SECTIONS.flatMap((s) => s.items);

export function PlatformDropdown({
  id,
  open,
  onMouseEnter,
  onMouseLeave,
}: {
  id: string;
  open: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      id={id}
      role="menu"
      aria-label="Platform"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`nav-dropdown nav-dropdown-center${open ? " nav-dropdown-open" : ""}`}
    >
      <div className="p-5" style={{ width: 280 }}>
        <div className="mono text-text-3 mb-3 px-2">Platform</div>
        <ul>
          {PLATFORM_ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                role="menuitem"
                tabIndex={open ? 0 : -1}
                className="nav-dropdown-item block px-2 py-2 rounded-[var(--r-sm)]"
              >
                <div className="text-sm font-medium text-text-1">{item.name}</div>
                <div className="text-text-3 text-xs mt-0.5 leading-snug">{item.desc}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
