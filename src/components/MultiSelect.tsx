"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDropdownPlacement } from "@/lib/use-dropdown-placement";

/**
 * Searchable multi-select with a selection cap, removable chips, and a
 * live "N / max selected" counter — reuses the same .select-panel/
 * .select-option dropdown grammar and useDropdownPlacement hook as
 * Select/CountrySelect/SchoolCombobox rather than a second dropdown
 * system. Selecting doesn't close the panel (users pick several in a
 * row); clicking outside, Escape, or the trigger itself closes it.
 */
export function MultiSelect({
  id,
  options,
  value,
  onChange,
  max,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
}: {
  id?: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  max?: number;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const atMax = max != null && value.length >= max;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  const { openUpward, maxHeight } = useDropdownPlacement(open, rootRef, 300);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else if (!atMax) {
      onChange([...value, option]);
    }
  }

  function remove(option: string) {
    onChange(value.filter((v) => v !== option));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % Math.max(matches.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + Math.max(matches.length, 1)) % Math.max(matches.length, 1));
    } else if (e.key === "Enter" || e.key === " ") {
      if (matches[highlighted]) {
        e.preventDefault();
        toggle(matches[highlighted]);
      }
    }
  }

  return (
    <div ref={rootRef} className="select-root">
      <button
        type="button"
        id={id}
        className="field-select select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
      >
        <span className={value.length ? "" : "text-text-3"}>
          {value.length ? `${value.length} selected` : placeholder}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="select-chevron">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={`select-panel multi-select-panel${openUpward ? " select-panel-up" : ""}`} style={{ maxHeight }}>
          <input
            autoFocus
            className="field-input multi-select-search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlighted(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <ul role="listbox" aria-multiselectable="true" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {matches.map((option, i) => {
              const checked = value.includes(option);
              const disabled = !checked && atMax;
              return (
                <li
                  key={option}
                  role="option"
                  aria-selected={checked}
                  aria-disabled={disabled}
                  className="select-option"
                  data-highlighted={i === highlighted}
                  data-disabled={disabled}
                  onMouseEnter={() => setHighlighted(i)}
                  onClick={() => !disabled && toggle(option)}
                >
                  <span className="multi-select-option-check" aria-hidden="true">
                    {checked && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span style={{ flex: 1 }}>{option}</span>
                </li>
              );
            })}
            {matches.length === 0 && <li className="multi-select-empty">No matches.</li>}
          </ul>
        </div>
      )}

      {(value.length > 0 || max != null) && (
        <div className="multi-select-footer">
          {value.length > 0 && (
            <ul className="multi-select-chips">
              {value.map((v) => (
                <li key={v} className="multi-select-chip">
                  <span>{v}</span>
                  <button type="button" onClick={() => remove(v)} aria-label={`Remove ${v}`}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {max != null && (
            <div className="multi-select-counter">
              {value.length} / {max} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}
