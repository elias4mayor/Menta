/**
 * Original, minimal inline-SVG line icons for the sidebar nav — no icon
 * library dependency, no copied/proprietary iconography. Same stroke
 * convention already used by AppShell's notification bell (24x24
 * viewBox, `fill="none" stroke="currentColor" strokeWidth="2"`), so a
 * new icon dropped in here matches without extra styling.
 */
const ICONS: Record<string, React.ReactNode> = {
  home: (
    <>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1V15a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4.5a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1V10" />
    </>
  ),
  spark: <path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1M12 8l1.3 3.7L17 13l-3.7 1.3L12 18l-1.3-3.7L7 13l3.7-1.3L12 8Z" />,
  train: <path d="M6 7v10M18 7v10M2 12h4M18 12h4M9 5v14M15 5v14" />,
  performance: <path d="M4 19V10M10 19V5M16 19v-7M22 19H2" />,
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M3 15h18M9 4v16M15 4v16" />
    </>
  ),
  recovery: <path d="M20 12a8 8 0 1 1-4.3-7.1M20 4v5h-5" />,
  mind: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  school: <path d="M2 9 12 4l10 5-10 5-10-5Z M6 11.5V17c0 1.1 2.7 3 6 3s6-1.9 6-3v-5.5" />,
  recruit: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.7" fill="currentColor" />
    </>
  ),
  safety: <path d="M12 3 4 6v6c0 4.5 3.2 7.7 8 9 4.8-1.3 8-4.5 8-9V6l-8-3Z" />,
  team: (
    <>
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="17" cy="9.5" r="2.3" />
      <path d="M2.5 19.5c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5M15 19.5c.3-2.2 2-4 4.2-4.4" />
    </>
  ),
  messages: <path d="M4 4h16v12H8l-4 4V4Z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  documents: (
    <>
      <path d="M6 2h9l5 5v15H6V2Z" />
      <path d="M15 2v5h5" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.5-2-3.4-2.3.8a7.6 7.6 0 0 0-2.6-1.5L14 2h-4l-.5 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.3-.8-2 3.4 2 1.5a7.7 7.7 0 0 0 0 3l-2 1.5 2 3.4 2.3-.8c.75.65 1.63 1.16 2.6 1.5L10 22h4l.5-2.4a7.6 7.6 0 0 0 2.6-1.5l2.3.8 2-3.4-2-1.5Z" />
    </>
  ),
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const path = ICONS[name];
  if (!path) return null;
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}
