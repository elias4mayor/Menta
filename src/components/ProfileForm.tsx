"use client";

import { useState } from "react";
import { Select } from "@/components/Select";
import { SPORTS as SPORT_CONFIGS, rolesForSport, roleLabel } from "@/lib/sports";

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

const BIO_MAX_LENGTH = 1000;
const SCHOOL_MAX_LENGTH = 160;
const CITY_MAX_LENGTH = 120;
const HEIGHT_MIN = 0;
const HEIGHT_MAX = 280;
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 300;
const GPA_MIN = 0;
const GPA_MAX = 5;

// Sport, position/event lists, and role/competition vocabulary now live in
// src/lib/sports.ts — the single sport-agnostic config every part of the
// app reads from, instead of a football-shaped list duplicated per form.
const SPORTS = SPORT_CONFIGS.map((s) => s.name);

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming", "Washington, D.C.", "Other",
];

const CURRENT_YEAR = new Date().getFullYear();
const GRADUATION_YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR + i);

const VISIBILITY_OPTIONS = [
  { value: "PRIVATE", label: "Private — only you" },
  { value: "TEAM", label: "Team — your teammates and coaches" },
  { value: "ORGANIZATION", label: "Organization" },
  { value: "RECRUITING", label: "Recruiting — visible to coaches" },
  { value: "PUBLIC", label: "Public" },
];

/** Keeps an existing stored value selectable even if it predates the fixed option list, instead of silently discarding it. */
function withCurrentValue(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

function withCurrentYear(years: number[], current: number | undefined): number[] {
  if (!current || years.includes(current)) return years;
  return [current, ...years].sort((a, b) => a - b);
}

type FieldErrors = Partial<Record<keyof ProfileData, string>>;

export function ProfileForm({ initial, isMinor }: { initial: ProfileData; isMinor: boolean }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
    setFieldErrors((f) => ({ ...f, [key]: undefined }));
  }

  function updateSport(sport: string) {
    // Changing sport must never wipe out an already-saved position that no
    // longer matches the new sport's list — only reset it when the current
    // position genuinely doesn't apply to the newly selected sport.
    setData((d) => {
      const nextPositions = rolesForSport(sport);
      const positionStillValid = !d.position || nextPositions.length === 0 || nextPositions.includes(d.position);
      return { ...d, sport, position: positionStillValid ? d.position : "" };
    });
    setSaved(false);
    setFieldErrors((f) => ({ ...f, sport: undefined }));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (data.heightCm !== undefined && (data.heightCm < HEIGHT_MIN || data.heightCm > HEIGHT_MAX)) {
      errors.heightCm = `Enter a height between ${HEIGHT_MIN} and ${HEIGHT_MAX} cm.`;
    }
    if (data.weightKg !== undefined && (data.weightKg < WEIGHT_MIN || data.weightKg > WEIGHT_MAX)) {
      errors.weightKg = `Enter a weight between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg.`;
    }
    if (data.gpa !== undefined && (data.gpa < GPA_MIN || data.gpa > GPA_MAX)) {
      errors.gpa = `Enter a GPA between ${GPA_MIN} and ${GPA_MAX}.`;
    }
    if (data.bio.length > BIO_MAX_LENGTH) {
      errors.bio = `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`;
    }
    if (data.schoolName.length > SCHOOL_MAX_LENGTH) {
      errors.schoolName = `School name must be ${SCHOOL_MAX_LENGTH} characters or fewer.`;
    }
    if (data.city.length > CITY_MAX_LENGTH) {
      errors.city = `City must be ${CITY_MAX_LENGTH} characters or fewer.`;
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
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

  const sportOptions = withCurrentValue(SPORTS, data.sport);
  const sportHasFixedRoles = rolesForSport(data.sport).length > 0;
  const roleOptions = withCurrentValue(rolesForSport(data.sport), data.position);
  const currentRoleLabel = roleLabel(data.sport);
  const stateOptions = withCurrentValue(US_STATES, data.state);
  const graduationYearOptions = withCurrentYear(GRADUATION_YEARS, data.graduationYear);

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-6 sm:p-8 space-y-6">
      <section className="space-y-4">
        <div className="mono text-text-3">Athletic</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="sport">Sport</label>
            <Select
              id="sport"
              value={data.sport}
              onChange={updateSport}
              placeholder="Select a sport"
              options={sportOptions.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="position">{currentRoleLabel}</label>
            {sportHasFixedRoles ? (
              <Select
                id="position"
                value={data.position}
                onChange={(v) => update("position", v)}
                placeholder={`Select a ${currentRoleLabel.toLowerCase()}`}
                options={roleOptions.map((p) => ({ value: p, label: p }))}
              />
            ) : (
              <input
                id="position"
                className="field-input"
                placeholder={data.sport === "Wrestling" ? "e.g. 138 lbs" : `Enter your ${currentRoleLabel.toLowerCase()}`}
                value={data.position}
                onChange={(e) => update("position", e.target.value)}
              />
            )}
          </div>
          <div>
            <label className="field-label" htmlFor="heightCm">Height (cm)</label>
            <input
              id="heightCm"
              type="number"
              min={HEIGHT_MIN}
              max={HEIGHT_MAX}
              className="field-input"
              value={data.heightCm ?? ""}
              onChange={(e) => update("heightCm", e.target.value ? Number(e.target.value) : undefined)}
              aria-invalid={Boolean(fieldErrors.heightCm)}
              aria-describedby={fieldErrors.heightCm ? "heightCm-error" : undefined}
            />
            {fieldErrors.heightCm && <p id="heightCm-error" className="text-xs mt-1" style={{ color: "var(--danger)" }}>{fieldErrors.heightCm}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="weightKg">Weight (kg)</label>
            <input
              id="weightKg"
              type="number"
              min={WEIGHT_MIN}
              max={WEIGHT_MAX}
              className="field-input"
              value={data.weightKg ?? ""}
              onChange={(e) => update("weightKg", e.target.value ? Number(e.target.value) : undefined)}
              aria-invalid={Boolean(fieldErrors.weightKg)}
              aria-describedby={fieldErrors.weightKg ? "weightKg-error" : undefined}
            />
            {fieldErrors.weightKg && <p id="weightKg-error" className="text-xs mt-1" style={{ color: "var(--danger)" }}>{fieldErrors.weightKg}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="mono text-text-3">Academic</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="schoolName">School</label>
            <input
              id="schoolName"
              className="field-input"
              maxLength={SCHOOL_MAX_LENGTH}
              value={data.schoolName}
              onChange={(e) => update("schoolName", e.target.value)}
              aria-invalid={Boolean(fieldErrors.schoolName)}
              aria-describedby={fieldErrors.schoolName ? "schoolName-error" : undefined}
            />
            {fieldErrors.schoolName && <p id="schoolName-error" className="text-xs mt-1" style={{ color: "var(--danger)" }}>{fieldErrors.schoolName}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="graduationYear">Graduation year</label>
            <Select
              id="graduationYear"
              value={data.graduationYear !== undefined ? String(data.graduationYear) : ""}
              onChange={(v) => update("graduationYear", v ? Number(v) : undefined)}
              placeholder="Select a year"
              options={graduationYearOptions.map((y) => ({ value: String(y), label: String(y) }))}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="gpa">GPA</label>
            <input
              id="gpa"
              type="number"
              step="0.01"
              min={GPA_MIN}
              max={GPA_MAX}
              className="field-input"
              value={data.gpa ?? ""}
              onChange={(e) => update("gpa", e.target.value ? Number(e.target.value) : undefined)}
              aria-invalid={Boolean(fieldErrors.gpa)}
              aria-describedby={fieldErrors.gpa ? "gpa-error" : undefined}
            />
            {fieldErrors.gpa && <p id="gpa-error" className="text-xs mt-1" style={{ color: "var(--danger)" }}>{fieldErrors.gpa}</p>}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="mono text-text-3">Location & bio</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="city">City</label>
            <input
              id="city"
              className="field-input"
              maxLength={CITY_MAX_LENGTH}
              value={data.city}
              onChange={(e) => update("city", e.target.value)}
              aria-invalid={Boolean(fieldErrors.city)}
              aria-describedby={fieldErrors.city ? "city-error" : undefined}
            />
            {fieldErrors.city && <p id="city-error" className="text-xs mt-1" style={{ color: "var(--danger)" }}>{fieldErrors.city}</p>}
          </div>
          <div>
            <label className="field-label" htmlFor="state">State</label>
            <Select
              id="state"
              value={data.state}
              onChange={(v) => update("state", v)}
              placeholder="Select a state"
              options={stateOptions.map((s) => ({ value: s, label: s }))}
            />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            rows={3}
            className="field-textarea"
            maxLength={BIO_MAX_LENGTH}
            value={data.bio}
            onChange={(e) => update("bio", e.target.value)}
            aria-invalid={Boolean(fieldErrors.bio)}
            aria-describedby="bio-counter"
          />
          <div className="flex items-center justify-between mt-1">
            {fieldErrors.bio ? (
              <p className="text-xs" style={{ color: "var(--danger)" }}>{fieldErrors.bio}</p>
            ) : <span />}
            <span id="bio-counter" className="text-text-3 text-xs">{data.bio.length}/{BIO_MAX_LENGTH}</span>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <label className="field-label" htmlFor="visibility">Visibility</label>
        <Select
          id="visibility"
          value={data.visibility}
          onChange={(v) => update("visibility", v)}
          options={VISIBILITY_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            disabled: isMinor && opt.value === "PUBLIC",
          }))}
        />
        {isMinor && (
          <p className="text-text-3 text-xs">
            Because this account is a minor, profile visibility is capped at Recruiting — visible to coaches, never fully public.
          </p>
        )}
        <p className="text-text-3 text-xs">
          Sensitive information (medical, emergency contacts, private messages) is never made public, regardless of this setting.
        </p>
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
