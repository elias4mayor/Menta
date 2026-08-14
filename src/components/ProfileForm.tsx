"use client";

import { useState } from "react";

type ProfileData = {
  sport: string;
  position: string;
  graduationYear?: number;
  heightCm?: number;
  weightKg?: number;
  schoolName: string;
  city: string;
  state: string;
  bio: string;
  gpa?: number;
  visibility: string;
};

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private — only you" },
  { value: "TEAM", label: "Team — your teammates and coaches" },
  { value: "ORGANIZATION", label: "Organization" },
  { value: "RECRUITING", label: "Recruiting — visible to coaches" },
  { value: "PUBLIC", label: "Public" },
];

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Couldn't save changes.");
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
    <form onSubmit={handleSubmit} className="card p-6 space-y-6">
      <section className="space-y-4">
        <div className="mono text-text-3">Athletic</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="sport">Sport</label>
            <input id="sport" className="field-input" value={data.sport} onChange={(e) => update("sport", e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="position">Position</label>
            <input id="position" className="field-input" value={data.position} onChange={(e) => update("position", e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="heightCm">Height (cm)</label>
            <input id="heightCm" type="number" className="field-input" value={data.heightCm ?? ""} onChange={(e) => update("heightCm", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div>
            <label className="field-label" htmlFor="weightKg">Weight (kg)</label>
            <input id="weightKg" type="number" className="field-input" value={data.weightKg ?? ""} onChange={(e) => update("weightKg", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="mono text-text-3">Academic</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="schoolName">School</label>
            <input id="schoolName" className="field-input" value={data.schoolName} onChange={(e) => update("schoolName", e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="graduationYear">Graduation year</label>
            <input id="graduationYear" type="number" className="field-input" value={data.graduationYear ?? ""} onChange={(e) => update("graduationYear", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div>
            <label className="field-label" htmlFor="gpa">GPA</label>
            <input id="gpa" type="number" step="0.01" className="field-input" value={data.gpa ?? ""} onChange={(e) => update("gpa", e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="mono text-text-3">Location & bio</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="city">City</label>
            <input id="city" className="field-input" value={data.city} onChange={(e) => update("city", e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="state">State</label>
            <input id="state" className="field-input" value={data.state} onChange={(e) => update("state", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="bio">Bio</label>
          <textarea id="bio" rows={3} className="field-textarea" value={data.bio} onChange={(e) => update("bio", e.target.value)} />
        </div>
      </section>

      <section className="space-y-2">
        <div className="mono text-text-3">Visibility</div>
        <select className="field-select" value={data.visibility} onChange={(e) => update("visibility", e.target.value)}>
          {VISIBILITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <p className="text-text-3 text-xs">
          Sensitive information (medical, emergency contacts, private messages) is never made public, regardless of this setting.
        </p>
      </section>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm" style={{ color: "var(--success)" }}>Saved.</span>}
      </div>
    </form>
  );
}
