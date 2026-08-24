"use client";

import { useEffect, useState } from "react";
import { CARE_REASONS, CARE_REASON_LABELS, CARE_STATUS_LABELS, type CareReason, type CareStatus } from "@/lib/care";

type Team = { id: string; name: string };
type Provider = { id: string; name: string; role: string; teamId: string; teamName: string; title: string; specialties: string[] };
type Slot = { start: string; end: string };
type CareRequestRecord = {
  id: string;
  reason: string;
  status: string;
  requestedStart: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  provider: { id: string; name: string };
  team: { id: string; name: string };
};

type FlowStep = "closed" | "reason" | "provider" | "slot" | "confirm";

export function CareRequestFlow({ teams }: { teams: Team[] }) {
  const [step, setStep] = useState<FlowStep>("closed");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [reason, setReason] = useState<CareReason | null>(null);
  const [note, setNote] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CareRequestRecord[]>([]);
  const [submitted, setSubmitted] = useState(false);

  async function loadHistory() {
    const res = await fetch("/api/care/requests");
    if (res.ok) {
      const data = await res.json();
      setHistory(data.requests);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadHistory();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function startFlow() {
    setError(null);
    setReason(null);
    setProviderId(null);
    setSelectedSlot(null);
    setSubmitted(false);
    setStep("reason");
  }

  async function pickReason(r: CareReason) {
    setReason(r);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/care/providers?teamId=${teamId}`);
      const data = await res.json();
      setProviders(data.providers ?? []);
      setStep("provider");
    } finally {
      setLoading(false);
    }
  }

  async function pickProvider(p: Provider) {
    setProviderId(p.id);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/care/availability?providerId=${p.id}&teamId=${teamId}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
      setStep("slot");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!reason || !providerId || !selectedSlot) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/care/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          teamId,
          reason,
          reasonNote: note || undefined,
          requestedStart: selectedSlot.start,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSubmitted(true);
      setStep("closed");
      await loadHistory();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function cancel(id: string) {
    await fetch(`/api/care/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CANCEL" }),
    });
    await loadHistory();
  }

  if (teams.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-text-2 text-sm">Join a team to request care from an authorized provider.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {submitted && (
        <div className="card p-4 text-sm" style={{ borderColor: "var(--success)" }}>
          Request sent. You&rsquo;ll be notified when your provider responds.
        </div>
      )}

      {step === "closed" ? (
        <button type="button" className="btn-primary" onClick={startFlow}>
          I NEED CARE
        </button>
      ) : (
        <div className="card p-6 space-y-4">
          {teams.length > 1 && step === "reason" && (
            <div>
              <label className="field-label" htmlFor="care-team">Team</label>
              <select id="care-team" className="field-select" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {step === "reason" && (
            <>
              <div className="mono text-text-3">What&rsquo;s this about?</div>
              <div className="flex flex-wrap gap-2">
                {CARE_REASONS.map((r) => (
                  <button key={r} type="button" className="badge" style={{ cursor: "pointer" }} onClick={() => pickReason(r)}>
                    {CARE_REASON_LABELS[r]}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "provider" && (
            <>
              <div className="mono text-text-3">Choose a provider</div>
              {loading ? (
                <p className="text-text-2 text-sm">Loading…</p>
              ) : providers.length === 0 ? (
                <p className="text-text-2 text-sm">No verified providers on this team yet.</p>
              ) : (
                <ul className="space-y-2">
                  {providers.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="btn-secondary w-full justify-start" onClick={() => pickProvider(p)}>
                        {p.name} — {p.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {step === "slot" && (
            <>
              <div className="mono text-text-3">Choose a time</div>
              {loading ? (
                <p className="text-text-2 text-sm">Loading…</p>
              ) : slots.length === 0 ? (
                <p className="text-text-2 text-sm">No open times in the next week. Try another provider.</p>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      className="badge"
                      style={{ cursor: "pointer", opacity: selectedSlot?.start === s.start ? 1 : 0.6 }}
                      onClick={() => setSelectedSlot(s)}
                    >
                      {new Date(s.start).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              )}
              {selectedSlot && (
                <>
                  <textarea
                    className="field-textarea"
                    rows={2}
                    placeholder="Anything your provider should know (optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
                  <button type="button" className="btn-primary" onClick={submit} disabled={loading}>
                    {loading ? "Sending…" : "Request this time"}
                  </button>
                </>
              )}
            </>
          )}

          <button type="button" className="text-xs text-text-3 hover:text-text-2" onClick={() => setStep("closed")}>
            Cancel
          </button>
        </div>
      )}

      <div>
        <div className="mono text-text-3 mb-3">Your care activity</div>
        {history.length === 0 ? (
          <p className="text-text-2 text-sm">No care requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((r) => (
              <li key={r.id} className="card p-4 text-sm flex items-center justify-between">
                <div>
                  <div>{CARE_REASON_LABELS[r.reason as CareReason]} — {r.provider.name}</div>
                  <div className="text-text-3 mono text-xs mt-1">
                    {CARE_STATUS_LABELS[r.status as CareStatus]}
                    {r.scheduledStart ? ` · ${new Date(r.scheduledStart).toLocaleString()}` : ""}
                  </div>
                </div>
                {r.status === "REQUESTED" && (
                  <button type="button" className="text-xs text-text-3 hover:text-text-2" onClick={() => cancel(r.id)}>
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
