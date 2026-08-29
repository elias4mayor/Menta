"use client";

import { useState } from "react";

export function BillingActions({ hasStripeCustomer }: { hasStripeCustomer: boolean }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't open billing management.");
        setStatus("error");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't reach the server. Try again.");
      setStatus("error");
    }
  }

  if (!hasStripeCustomer) {
    return (
      <p className="text-text-3 text-sm">
        You&rsquo;re on the free plan — nothing to manage yet. Upgrade below to unlock more.
      </p>
    );
  }

  return (
    <div>
      <button className="btn-secondary" onClick={openPortal} disabled={status === "loading"}>
        {status === "loading" ? "Opening…" : "Manage subscription →"}
      </button>
      <p className="text-text-3 text-xs mt-2">
        Update your card, change plans, or cancel — handled securely by Stripe.
      </p>
      {error && <p className="text-xs text-[var(--danger)] mt-2">{error}</p>}
    </div>
  );
}
