"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SplitAuthShell } from "@/components/SplitAuthShell";
import { OAuthButtons } from "@/components/OAuthButtons";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Sign-in isn't configured yet — an administrator needs to set up OAuth on the server.",
  invalid_state: "That sign-in attempt expired or was invalid. Please try again.",
  exchange_failed: "Couldn't complete sign-in with that provider. Please try again.",
  no_email: "That account didn't share an email address, so we can't sign you in with it.",
};

function providerLabel(provider: string | null): string {
  if (provider === "google") return "Google";
  if (provider === "facebook") return "Facebook";
  return "That provider";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const oauthError = searchParams.get("oauthError");
  const oauthProvider = searchParams.get("provider");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SplitAuthShell
      eyebrow="Welcome back"
      title="Log in"
      footer={
        <>
          Don&rsquo;t have an account?{" "}
          <Link href="/signup" className="auth-link">
            Join the beta
          </Link>
        </>
      }
    >
      {oauthError && (
        <p className="text-sm mb-4" style={{ color: "var(--warning)" }}>
          {OAUTH_ERROR_MESSAGES[oauthError] ?? `Couldn't sign in with ${providerLabel(oauthProvider)}.`}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field-underline" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="field-label" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="auth-link text-xs">
              Forgot?
            </Link>
          </div>
          <input id="password" type="password" className="field-underline" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
      <OAuthButtons />
    </SplitAuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
