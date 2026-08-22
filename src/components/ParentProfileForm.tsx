"use client";

import { useState } from "react";
import { Select } from "@/components/Select";
import { RELATIONSHIPS } from "@/components/ParentOnboarding";

const PHONE_MAX = 30;

type ParentData = {
  phone: string;
  relationship: string;
};

function withCurrentValue(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [current, ...options];
}

export function ParentProfileForm({ initial }: { initial: ParentData }) {
  const [data, setData] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ParentData>(key: K, value: ParentData[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/parent", {
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

  const relationshipOptions = withCurrentValue(RELATIONSHIPS, data.relationship);

  return (
    <form onSubmit={handleSubmit} noValidate className="card p-6 sm:p-8 space-y-6">
      <section className="space-y-4">
        <div className="mono text-text-3">About you</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="parent-phone">Phone</label>
            <input
              id="parent-phone"
              className="field-input"
              maxLength={PHONE_MAX}
              value={data.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="parent-relationship">Relationship to athlete</label>
            <Select
              id="parent-relationship"
              value={data.relationship}
              onChange={(v) => update("relationship", v)}
              placeholder="Select one"
              options={relationshipOptions.map((r) => ({ value: r, label: r }))}
            />
          </div>
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
