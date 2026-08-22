"use client";

import { useState } from "react";
import { Select } from "@/components/Select";
import { SPORTS as SPORT_CONFIGS } from "@/lib/sports";
import { COACHING_ROLES, FOCUS_AREAS } from "@/components/CoachOnboarding";

const SPORTS = SPORT_CONFIGS.map((s) => s.name);
const PHONE_MAX = 30;
const ORG_MAX = 160;

type CoachData = {
  phone: string;
  sport: string;
  coachingRole: string;
  yearsCoaching?: number;
  organizationName: string;
  schoolName: string;
  focusAreas: string[];
};

function withCurrentValue(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

export function CoachProfileForm({ initial }: { initial: CoachData }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CoachData>(key: K, value: CoachData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  function toggleFocus(area: string) {
    update("focusAreas", data.focusAreas.includes(area) ? data.focusAreas.filter((a) => a !== area) : [...data.focusAreas, area]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/coach", {
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

  const sportOptions = withCurrentValue(SPORTS, data.sport);
  const roleOptions = withCurrentValue(COACHING_ROLES, data.coachingRole);

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-6 sm:p-8 space-y-6">
      <section className="space-y-4">
        <div className="mono text-text-3">Coaching</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="coach-sport">Sport</label>
            <Select
              id="coach-sport"
              value={data.sport}
              onChange={(v) => update("sport", v)}
              placeholder="Select a sport"
              options={sportOptions.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="coach-role">Coaching role</label>
            <Select
              id="coach-role"
              value={data.coachingRole}
              onChange={(v) => update("coachingRole", v)}
              placeholder="Select a role"
              options={roleOptions.map((r) => ({ value: r, label: r }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="coach-years">Years coaching</label>
            <input
              id="coach-years"
              type="number"
              min={0}
              max={70}
              className="field-input"
              value={data.yearsCoaching ?? ""}
              onChange={(e) => update("yearsCoaching", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="coach-phone">Phone</label>
            <input
              id="coach-phone"
              className="field-input"
              maxLength={PHONE_MAX}
              value={data.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="mono text-text-3">Organization</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="coach-org">Organization</label>
            <input
              id="coach-org"
              className="field-input"
              maxLength={ORG_MAX}
              value={data.organizationName}
              onChange={(e) => update("organizationName", e.target.value)}
              placeholder="Ridgeview Athletics"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="coach-school">School / club</label>
            <input
              id="coach-school"
              className="field-input"
              maxLength={ORG_MAX}
              value={data.schoolName}
              onChange={(e) => update("schoolName", e.target.value)}
              placeholder="Ridgeview High School"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="field-label">What do you want MENTA to help with?</div>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => toggleFocus(area)}
              className="badge"
              style={{ cursor: "pointer", opacity: data.focusAreas.includes(area) ? 1 : 0.5 }}
            >
              {area}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

      <div className="flex flex-col items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm" style={{ color: "var(--success)" }}>Saved.</span>}
      </div>
    </form>
  );
}
