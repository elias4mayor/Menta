"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { SplitAuthShell } from "@/components/SplitAuthShell";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
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
          <Link href="/signup" className="text-text-1 underline">
            Join the beta
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field-underline" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="field-label" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-xs text-text-2 hover:text-text-1">
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
