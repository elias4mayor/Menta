"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TeamActions({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">(compact ? "join" : "create");
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sport: sport || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create team.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't join team.");
        return;
      }
      setInviteCode("");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!compact && (
        <div className="flex gap-2 mb-4">
          <button type="button" className={mode === "create" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("create")}>
            Create a team
          </button>
          <button type="button" className={mode === "join" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("join")}>
            Join with code
          </button>
        </div>
      )}

      {mode === "create" && !compact ? (
        <form onSubmit={handleCreate} className="space-y-3 max-w-sm">
          <input className="field-input" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input className="field-input" placeholder="Sport (optional)" value={sport} onChange={(e) => setSport(e.target.value)} />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Creating…" : "Create team"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="flex gap-2 max-w-sm">
          <input className="field-input" placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
          <button type="submit" disabled={loading} className="btn-secondary shrink-0">
            {loading ? "Joining…" : "Join"}
          </button>
          {error && <p className="text-sm w-full" style={{ color: "var(--danger)" }}>{error}</p>}
        </form>
      )}
    </div>
  );
}
