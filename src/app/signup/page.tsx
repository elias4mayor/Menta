"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SplitAuthShell } from "@/components/SplitAuthShell";
import { OAuthButtons } from "@/components/OAuthButtons";

const ROLES = [
  { value: "ATHLETE", label: "Athlete" },
  { value: "COACH", label: "Coach" },
  { value: "PARENT", label: "Parent / Guardian" },
  { value: "TRAINER", label: "Trainer" },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ATHLETE");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, dateOfBirth: dateOfBirth || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/verify-email");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SplitAuthShell
      eyebrow="Create account"
      title="Join MENTA"
      subtitle="Free during the beta. Athletes under 18 need a parent or guardian to approve their account."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="auth-link">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="field-label" htmlFor="name">Full name</label>
          <input id="name" className="field-underline" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="field-underline" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field-underline" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
          <p className="text-text-3 text-xs mt-1">At least 10 characters.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="dob">Date of birth</label>
          <input id="dob" type="date" className="field-underline" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="role">I am a...</label>
          <select id="role" className="field-underline" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <label className="flex items-start gap-2 text-text-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" target="_blank" className="auth-link">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="auth-link">
              Privacy Policy
            </Link>{" "}
            (published drafts, pending legal review).
          </span>
        </label>
        {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
        <button type="submit" disabled={loading || !agreed} className="btn-primary w-full justify-center">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <OAuthButtons />
    </SplitAuthShell>
  );
}
