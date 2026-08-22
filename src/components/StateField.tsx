"use client";

import { Select } from "@/components/Select";
import { US_STATES } from "@/lib/geo";

/**
 * State/province field — a real searchable dropdown of the 50 states + DC
 * when the country is the United States (the only place this app has a
 * real, verified state list), and a plain text input otherwise. Per the
 * onboarding spec: "State: Dynamic based on country."
 */
export function StateField({
  id,
  country,
  value,
  onChange,
}: {
  id?: string;
  country: string;
  value: string;
  onChange: (value: string) => void;
}) {
  if (country === "United States") {
    return (
      <Select
        id={id}
        value={value}
        onChange={onChange}
        placeholder="Select a state"
        options={US_STATES.map((s) => ({ value: s.name, label: s.name }))}
      />
    );
  }

  return (
    <input
      id={id}
      className="field-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="State / province"
    />
  );
}
