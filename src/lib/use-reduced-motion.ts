import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** SSR has no window; assume motion is allowed for the initial server render (matches PortalHero's own default-to-finished-state fallback), then useSyncExternalStore corrects it right after hydration if the real preference differs — the sanctioned way to read browser-only state without setState-in-effect. */
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

/** Client-only. The one shared way to read prefers-reduced-motion — see MembershipExperience.tsx and ScrollReveal.tsx. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}
