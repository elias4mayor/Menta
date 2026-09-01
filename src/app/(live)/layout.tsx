import { requireUser } from "@/lib/auth-guards";

/**
 * MENTA LIVE's own chrome-free shell — deliberately not AppShell. A
 * weight-room screen (athlete phone, coach tablet, wall-mounted TV) needs
 * zero sidebar/topbar/bottom-nav competing with the one primary action on
 * screen; each LIVE component supplies its own full-bleed .live-root
 * theme. Same auth boundary as (app)'s layout (requireUser() is the real,
 * DB-backed check — src/proxy.ts's redirect is only the cheap optimistic
 * one), just without the AppShell wrapper.
 */
export default async function LiveLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <>{children}</>;
}
