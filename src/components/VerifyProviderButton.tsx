"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VerifyProviderButton({ membershipId }: { membershipId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    try {
      await fetch("/api/team/verify-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" className="text-xs text-text-2 hover:text-text-1" onClick={verify} disabled={loading}>
      {loading ? "Verifying…" : "Verify provider"}
    </button>
  );
}
