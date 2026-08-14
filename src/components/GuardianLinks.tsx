"use client";

import { useEffect, useState } from "react";

type LinkUser = { id: string; name: string; email: string };
type GuardianLink = { id: string; status: string; createdAt: string };
type AsGuardian = GuardianLink & { athlete: LinkUser };
type AsAthlete = GuardianLink & { guardian: LinkUser };

export function GuardianLinks({ role }: { role: string }) {
  const [asGuardian, setAsGuardian] = useState<AsGuardian[] | null>(null);
  const [asAthlete, setAsAthlete] = useState<AsAthlete[] | null>(null);
  const [email, setEmail] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/guardian")
      .then((r) => r.json())
      .then((d) => {
        setAsGuardian(d.asGuardian ?? []);
        setAsAthlete(d.asAthlete ?? []);
      });
  }

  useEffect(load, []);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setRequesting(true);
    setError(null);
    try {
      const res = await fetch("/api/guardian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteEmail: email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Couldn't send request.");
        return;
      }
      setEmail("");
      load();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setRequesting(false);
    }
  }

  async function setStatus(id: string, status: "APPROVED" | "REVOKED") {
    await fetch(`/api/guardian/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (!asGuardian || !asAthlete) return <p className="text-text-2 text-sm">Loading…</p>;

  return (
    <div className="space-y-6">
      {role === "PARENT" && (
        <div>
          <div className="mono text-text-3 mb-2">Request access to an athlete</div>
          <form onSubmit={requestLink} className="flex gap-2">
            <input
              type="email"
              required
              className="field-input"
              placeholder="Athlete's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={requesting} className="btn-primary shrink-0">
              {requesting ? "Sending…" : "Request"}
            </button>
          </form>
          {error && <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
        </div>
      )}

      {asGuardian.length > 0 && (
        <div>
          <div className="mono text-text-3 mb-2">Athletes you&rsquo;ve requested</div>
          <ul className="space-y-2 text-sm">
            {asGuardian.map((l) => (
              <li key={l.id} className="flex items-center justify-between">
                <span>
                  {l.athlete.name} <span className="text-text-3">({l.athlete.email})</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="badge">{l.status}</span>
                  {l.status !== "REVOKED" && (
                    <button onClick={() => setStatus(l.id, "REVOKED")} className="text-xs text-text-3 hover:text-text-1">
                      Cancel
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {asAthlete.length > 0 && (
        <div>
          <div className="mono text-text-3 mb-2">Your guardians</div>
          <ul className="space-y-2 text-sm">
            {asAthlete.map((l) => (
              <li key={l.id} className="flex items-center justify-between">
                <span>
                  {l.guardian.name} <span className="text-text-3">({l.guardian.email})</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="badge">{l.status}</span>
                  {l.status === "PENDING" && (
                    <>
                      <button onClick={() => setStatus(l.id, "APPROVED")} className="text-xs text-text-1 hover:underline">
                        Approve
                      </button>
                      <button onClick={() => setStatus(l.id, "REVOKED")} className="text-xs text-text-3 hover:text-text-1">
                        Deny
                      </button>
                    </>
                  )}
                  {l.status === "APPROVED" && (
                    <button onClick={() => setStatus(l.id, "REVOKED")} className="text-xs text-text-3 hover:text-text-1">
                      Revoke
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {role !== "PARENT" && asAthlete.length === 0 && (
        <p className="text-text-2 text-sm">No guardian requests yet.</p>
      )}
    </div>
  );
}
