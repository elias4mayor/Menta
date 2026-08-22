"use client";

import { useState } from "react";
import { Select } from "@/components/Select";
import { MultiSelect } from "@/components/MultiSelect";
import { CountrySelect } from "@/components/CountrySelect";
import { PhoneInput } from "@/components/PhoneInput";
import { SPORTS as SPORT_CONFIGS } from "@/lib/sports";
import { COACHING_ROLES } from "@/components/CoachOnboarding";
import { GOAL_OPTIONS, GOALS_MAX } from "@/lib/goals";

const SPORTS = SPORT_CONFIGS.map((s) => s.name);
const ORG_MAX = 160;

type CoachData = {
  phone: string;
  sport: string;
  coachingRole: string;
  yearsCoaching?: number;
  organizationName: string;
  schoolName: string;
  country: string;
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
            <PhoneInput id="coach-phone" value={data.phone} onChange={(v) => update("phone", v)} />
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
          <div>
            <label className="field-label" htmlFor="coach-country">Country</label>
            <CountrySelect id="coach-country" value={data.country} onChange={(v) => update("country", v)} />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="field-label">What do you want to improve with your team?</div>
        <MultiSelect
          options={GOAL_OPTIONS.COACH}
          value={data.focusAreas}
          onChange={(v) => update("focusAreas", v)}
          max={GOALS_MAX}
          placeholder="Select your goals"
          searchPlaceholder="Search goals…"
        />
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
