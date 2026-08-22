"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";
import { GuardianLinks } from "@/components/GuardianLinks";

const RELATIONSHIPS = ["Parent", "Guardian", "Other"];

/**
 * Parent/guardian onboarding — Phase 1 scope. Saves a real ParentProfile
 * via /api/onboarding/parent, then reuses the existing GuardianLinks
 * component (src/app/api/guardian) for connecting to an athlete — that
 * request/approve flow already exists and works; onboarding just surfaces
 * it as a step instead of only living in Settings.
 */
export function ParentOnboarding({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.split(" ")[0];

  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone || undefined, relationship: relationship || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function enterDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="onb-root">
      <div className="onb-ambient" aria-hidden="true" />
      <Image src="/logo.png" alt="MENTA" width={863} height={194} className="onb-logo" priority />

      <div className="onb-stage" style={{ maxWidth: 520 }}>
        <div className="onb-content onb-enter">
          {!saved ? (
            <>
              <h1 className="onb-title">Welcome to MENTA, {firstName}.</h1>
              <p className="onb-subtitle">Stay connected to the athlete without adding more noise.</p>

              <form onSubmit={saveProfile} className="onb-fields space-y-4">
                <div>
                  <label className="field-label" htmlFor="parent-phone">Phone</label>
                  <input id="parent-phone" className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
                </div>
                <div>
                  <label className="field-label" htmlFor="parent-relationship">Relationship to athlete</label>
                  <Select
                    id="parent-relationship"
                    value={relationship}
                    onChange={setRelationship}
                    placeholder="Select one"
                    options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
                  />
                </div>

                {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

                <div className="onb-actions">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? "Saving…" : "Continue"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="onb-title">Connect your athlete</h1>
              <p className="onb-subtitle">
                Send a request to the email on their MENTA account. They&rsquo;ll need to approve it before you can see anything of theirs.
              </p>

              <div className="onb-fields text-left">
                <GuardianLinks role="PARENT" />
              </div>

              <p className="onb-micro" style={{ marginTop: 16 }}>
                You can also do this later from Settings.
              </p>

              <div className="onb-actions">
                <button type="button" className="btn-primary" onClick={enterDashboard}>
                  Enter MENTA
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
