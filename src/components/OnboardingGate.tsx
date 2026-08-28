"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { MentaIntro } from "@/components/MentaIntro";

/**
 * Plays the cinematic first-launch intro once, then reveals the real
 * (role-specific, already-built) onboarding content. Client-side gate only
 * — see MentaIntro.tsx for why no persisted "have I seen this" flag is
 * needed.
 */
export function OnboardingGate({
  role,
  firstName,
  children,
}: {
  role: string;
  firstName: string;
  children: ReactNode;
}) {
  const [introDone, setIntroDone] = useState(false);

  if (!introDone) {
    return <MentaIntro role={role} firstName={firstName} onDone={() => setIntroDone(true)} />;
  }

  return <>{children}</>;
}
