"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SplitAuthShell } from "@/components/SplitAuthShell";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <SplitAuthShell eyebrow="Reset password" title="Invalid link">
        <p className="text-sm text-text-2">
          This reset link is missing its token. Request a new one from the forgot-password page.
        </p>
      </SplitAuthShell>
    );
  }

  return (
    <SplitAuthShell eyebrow="Reset password" title="Choose a new password">
      {done ? (
        <p className="text-sm text-text-2">Password updated. Redirecting to log in…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label" htmlFor="password">New password</label>
            <input id="password" type="password" className="field-underline" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </SplitAuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
