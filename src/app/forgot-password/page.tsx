"use client";

import { useState } from "react";
import Link from "next/link";
import { SplitAuthShell } from "@/components/SplitAuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message ?? "If that email has an account, a reset link has been sent.");
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SplitAuthShell
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="We'll send a reset link to your email."
      footer={
        <Link href="/login" className="auth-link">
          Back to log in
        </Link>
      }
    >
      {message ? (
        <p className="text-sm text-text-2">{message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="field-underline" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </SplitAuthShell>
  );
}
