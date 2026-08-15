"use client";

import { useState } from "react";

export type SafetyProfileData = {
  allergies: string;
  medicalNotes: string;
  medicationNotes: string;
  emergencyPlanNotes: string;
};

export function PersonalSafetyProfile({ initial }: { initial: SafetyProfileData }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SafetyProfileData>(key: K, value: SafetyProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/safety/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Couldn't save.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-text-2 text-sm">
        Private to you. Never shown on your profile, recruiting page, or to teammates — see the privacy
        note below.
      </p>
      <div>
        <label className="field-label" htmlFor="allergies">Allergies</label>
        <textarea id="allergies" className="field-textarea" rows={2} value={data.allergies} onChange={(e) => update("allergies", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="medicalNotes">Relevant medical information</label>
        <textarea id="medicalNotes" className="field-textarea" rows={2} value={data.medicalNotes} onChange={(e) => update("medicalNotes", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="medicationNotes">Medications</label>
        <textarea id="medicationNotes" className="field-textarea" rows={2} value={data.medicationNotes} onChange={(e) => update("medicationNotes", e.target.value)} />
      </div>
      <div>
        <label className="field-label" htmlFor="emergencyPlanNotes">Your own emergency plan notes</label>
        <textarea id="emergencyPlanNotes" className="field-textarea" rows={3} value={data.emergencyPlanNotes} onChange={(e) => update("emergencyPlanNotes", e.target.value)} />
        <p className="text-text-3 text-xs mt-1">
          Your own notes — not a substitute for your team&rsquo;s or venue&rsquo;s official emergency action plan.
        </p>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm" style={{ color: "var(--success)" }}>Saved.</span>}
      </div>
    </form>
  );
}
