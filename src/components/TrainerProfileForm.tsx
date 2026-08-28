"use client";

import { useState } from "react";
import { Select } from "@/components/Select";
import { MultiSelect } from "@/components/MultiSelect";
import { CountrySelect } from "@/components/CountrySelect";
import { PhoneInput } from "@/components/PhoneInput";
import { SPORTS as SPORT_CONFIGS } from "@/lib/sports";
import { SPECIALTIES } from "@/components/TrainerOnboarding";
import { GOAL_OPTIONS, GOALS_MAX } from "@/lib/goals";

const SPORTS = SPORT_CONFIGS.map((s) => s.name);
const TEXT_MAX = 160;
const CERTS_MAX = 300;
const PHILOSOPHY_MAX = 500;

type TrainerData = {
  phone: string;
  businessName: string;
  sport: string;
  specialties: string[];
  trainingLocation: string;
  yearsExperience?: number;
  certifications: string;
  trainingPhilosophy: string;
  country: string;
  goals: string[];
};

function withCurrentValue(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

export function TrainerProfileForm({ initial }: { initial: TrainerData }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof TrainerData>(key: K, value: TrainerData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  function toggleSpecialty(s: string) {
    update("specialties", data.specialties.includes(s) ? data.specialties.filter((x) => x !== s) : [...data.specialties, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/trainer", {
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

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-6 sm:p-8 space-y-6">
      <section className="space-y-4">
        <div className="mono text-text-3">Training</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="trainer-sport">Primary sport</label>
            <Select
              id="trainer-sport"
              value={data.sport}
              onChange={(v) => update("sport", v)}
              placeholder="Select a sport"
              options={sportOptions.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="trainer-years">Years experience</label>
            <input
              id="trainer-years"
              type="number"
              min={0}
              max={70}
              className="field-input"
              value={data.yearsExperience ?? ""}
              onChange={(e) => update("yearsExperience", e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="trainer-phone">Phone</label>
            <PhoneInput id="trainer-phone" value={data.phone} onChange={(v) => update("phone", v)} />
          </div>
          <div>
            <label className="field-label" htmlFor="trainer-location">Training location</label>
            <input
              id="trainer-location"
              className="field-input"
              maxLength={TEXT_MAX}
              value={data.trainingLocation}
              onChange={(e) => update("trainingLocation", e.target.value)}
              placeholder="Gym, facility, or city"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="trainer-country">Country</label>
            <CountrySelect id="trainer-country" value={data.country} onChange={(v) => update("country", v)} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="mono text-text-3">Business</div>
        <div>
          <label className="field-label" htmlFor="trainer-business">Business / organization</label>
          <input
            id="trainer-business"
            className="field-input"
            maxLength={TEXT_MAX}
            value={data.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="trainer-certs">Certifications</label>
          <input
            id="trainer-certs"
            className="field-input"
            maxLength={CERTS_MAX}
            value={data.certifications}
            onChange={(e) => update("certifications", e.target.value)}
            placeholder="CSCS, USAW, etc. (optional)"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="trainer-philosophy">Training philosophy</label>
          <textarea
            id="trainer-philosophy"
            rows={3}
            className="field-textarea"
            maxLength={PHILOSOPHY_MAX}
            value={data.trainingPhilosophy}
            onChange={(e) => update("trainingPhilosophy", e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-2">
        <div className="field-label">Specialties</div>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpecialty(s)}
              className="badge"
              style={{ cursor: "pointer", opacity: data.specialties.includes(s) ? 1 : 0.5 }}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="field-label">What do you want to improve with your athletes?</div>
        <MultiSelect
          options={GOAL_OPTIONS.TRAINER}
          value={data.goals}
          onChange={(v) => update("goals", v)}
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
