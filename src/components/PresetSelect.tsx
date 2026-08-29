"use client";

import { useState } from "react";

/**
 * A dropdown of common presets with a "Custom…" escape hatch — Tempo,
 * Rest, Hold, Transition all want "pick a common value, or type your
 * own" rather than a bare free-text box. The underlying value stays a
 * single plain string/number (whatever the caller passes), so this adds
 * no new data shape — it's purely a friendlier way to fill in the exact
 * same field a text input would.
 */
export function PresetSelect({
  value,
  presets,
  onChange,
  placeholder,
  className = "field-input text-xs",
}: {
  value: string;
  presets: { label: string; value: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const matchesPreset = presets.some((p) => p.value === value);
  const [customMode, setCustomMode] = useState(value !== "" && !matchesPreset);

  if (customMode) {
    return (
      <div className="flex items-center gap-1">
        <input
          className={className}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className="text-text-3 hover:text-text-1 text-xs shrink-0"
          onClick={() => {
            setCustomMode(false);
            onChange("");
          }}
        >
          ⟲
        </button>
      </div>
    );
  }

  return (
    <select
      className={className.replace("field-input", "field-select")}
      value={matchesPreset ? value : ""}
      onChange={(e) => {
        if (e.target.value === "__custom__") {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
    >
      <option value="">{placeholder ?? "Select…"}</option>
      {presets.map((p) => (
        <option key={p.value} value={p.value}>{p.label}</option>
      ))}
      <option value="__custom__">Custom…</option>
    </select>
  );
}
