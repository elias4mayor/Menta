"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VerificationCodeInput } from "@/components/VerificationCodeInput";

const RESEND_COOLDOWN_MS = 45 * 1000;

export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [cooldownMs, setCooldownMs] = useState(0);
  const cooldownStart = useRef<number | null>(null);

  useEffect(() => {
    if (cooldownMs <= 0) return;
    cooldownStart.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - (cooldownStart.current ?? Date.now());
      const remaining = cooldownMs - elapsed;
      if (remaining <= 0) {
        setCooldownMs(0);
        clearInterval(interval);
      }
    }, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when a new cooldown is set
  }, [cooldownMs > 0]);

  async function submitCode(submitted: string) {
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: submitted }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setCode("");
        return;
      }
      setDone(true);
      // Was router.push("/dashboard") — for a freshly-verified account
      // onboarding is never complete yet, so proxy.ts always redirected
      // that straight back to /onboarding. That redirected push left the
      // App Router's client-side cache believing "/dashboard" resolves to
      // /onboarding for the rest of the session: later, once onboarding
      // actually finished and the reveal screen's "Enter MENTA" called
      // router.push("/dashboard") for real, it silently no-opped (no
      // request, no navigation) instead of re-checking — confirmed via
      // network trace, not assumed. Pushing straight to the real
      // destination here avoids ever creating that stale entry.
      setTimeout(() => router.push("/onboarding"), 900);
    } catch {
      setError("Network error. Try again.");
      setCode("");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setResendState("sending");
    setError(null);
    try {
      const res = await fetch("/api/auth/verify-email/resend", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't resend the code.");
        setResendState("error");
        if (typeof data.retryAfterMs === "number") setCooldownMs(data.retryAfterMs);
        return;
      }
      setResendState("sent");
      setCooldownMs(data.cooldownMs ?? RESEND_COOLDOWN_MS);
      setCode("");
    } catch {
      setError("Network error. Try again.");
      setResendState("error");
    }
  }

  const cooldownSeconds = Math.ceil(cooldownMs / 1000);

  async function handleChangeEmail() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/signup");
    router.refresh();
  }

  if (done) {
    return <p className="text-sm text-text-2 text-center">Verified. Taking you in…</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-2 text-center">
        Enter the 6-digit code we sent to <strong className="text-text-1">{email}</strong>.
      </p>

      <VerificationCodeInput
        value={code}
        onChange={setCode}
        onComplete={submitCode}
        disabled={verifying}
        error={Boolean(error)}
      />

      {error && (
        <p className="text-sm text-center" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="text-center text-sm text-text-2">
        {cooldownMs > 0 ? (
          <span className="text-text-3">Resend code in {cooldownSeconds}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendState === "sending"}
            className="auth-link"
          >
            {resendState === "sending" ? "Sending…" : "Resend code"}
          </button>
        )}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={handleChangeEmail}
          className="text-xs text-text-3 hover:text-text-2 transition-colors"
        >
          Wrong email? Log out and start over
        </button>
      </div>
    </div>
  );
}
