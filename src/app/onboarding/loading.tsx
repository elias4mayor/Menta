import Image from "next/image";

/**
 * Next.js route-level loading boundary for /onboarding. OnboardingPage is
 * an async server component (it awaits requireUser(), a real session/DB
 * lookup) — without this file, the browser has nothing to paint until that
 * resolves, so the root layout's dark theme background shows through as a
 * black flash before the onboarding experience's white background mounts.
 * This renders the same .onb-root shell + logo instantly (plain server
 * HTML, no client JS needed) so there's always a visible, correctly
 * themed screen from the first paint.
 */
export default function OnboardingLoading() {
  return (
    <div className="onb-root">
      <div className="onb-ambient" aria-hidden="true" />
      <Image src="/logo.png" alt="MENTA" width={863} height={194} className="onb-logo" priority />
    </div>
  );
}
