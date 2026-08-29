"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Individual-plan CTA. Logged-out visitors go create an account first —
 * checkout requires a session (src/app/api/subscriptions/checkout). A
 * signed-in visitor's click starts real Stripe Checkout, or surfaces the
 * honest "billing not configured" state rather than pretending to work.
 */
export function PricingCheckoutButton({
  planKey,
  isSignedIn,
  isCurrentPlan,
  isFree,
  className,
  children,
}: {
  planKey: string;
  isSignedIn: boolean;
  isCurrentPlan: boolean;
  isFree: boolean;
  className: string;
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <Link href={isFree ? "/signup" : `/signup?plan=${planKey}`} className={className}>
        {children}
      </Link>
    );
  }

  if (isCurrentPlan) {
    return (
      <button className={className} disabled>
        Your current plan
      </button>
    );
  }

  async function startCheckout() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't start checkout.");
        setStatus("error");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server. Try again.");
      setStatus("error");
    }
  }

  return (
    <div>
      <button className={className} onClick={startCheckout} disabled={status === "loading"}>
        {status === "loading" ? "Redirecting…" : children}
      </button>
      {error && <p className="text-xs text-[var(--danger)] mt-2">{error}</p>}
    </div>
  );
}
