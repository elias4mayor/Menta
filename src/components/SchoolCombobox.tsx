"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDropdownPlacement } from "@/lib/use-dropdown-placement";

const DEBOUNCE_MS = 300;

type SchoolResult = { name: string; state: string; country: string; type: "High School" | "College" };

/**
 * Free-text school field with search-as-you-type suggestions from the
 * real, server-side school datasets (2,181 named U.S. high schools +
 * 1,389 named U.S. colleges/universities — src/lib/schools-server.ts) —
 * never sent to the browser in bulk, only the matching results for one
 * query at a time via /api/schools/search. Like CitySelect, this stays a
 * plain text input underneath: the datasets are real but not exhaustive
 * (U.S.-only, named institutions only), so whatever the user types is
 * accepted as-is even if it isn't one of the suggestions.
 *
 * `country`/`state`/`schoolType` are all optional so this stays
 * backward-compatible with ProfileForm's existing unscoped usage — when
 * omitted, results aren't filtered by location or type. Onboarding passes
 * all three to scope suggestions and to search the right dataset for the
 * selected School Type.
 */
export function SchoolCombobox({
  id,
  country,
  state,
  schoolType,
  value,
  onChange,
  placeholder = "Start typing your school's name…",
}: {
  id?: string;
  country?: string;
  state?: string;
  schoolType?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<SchoolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [covered, setCovered] = useState(true);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      const params = new URLSearchParams({ q: value.trim() });
      if (country) params.set("country", country);
      if (state) params.set("state", state);
      if (schoolType) params.set("type", schoolType);
      fetch(`/api/schools/search?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setMatches(Array.isArray(data.schools) ? data.schools : []);
          setCovered(data.covered !== false);
          setHighlighted(0);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") setMatches([]);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value, country, state, schoolType]);

  const showList = open && (loading || matches.length > 0 || value.trim().length > 0);
  const { openUpward, maxHeight } = useDropdownPlacement(showList, rootRef);

  function choose(school: SchoolResult) {
    onChange(school.name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showList || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      if (matches[highlighted]) {
        e.preventDefault();
        choose(matches[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="select-root">
      <input
        id={id}
        className="field-input"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
      />
      {showList && (
        <ul id={listboxId} role="listbox" className={`select-panel${openUpward ? " select-panel-up" : ""}`} style={{ maxHeight }}>
          {loading ? (
            <li className="px-3 py-2 text-text-3 text-sm">Searching…</li>
          ) : matches.length > 0 ? (
            matches.map((school, i) => (
              <li
                key={`${school.name}-${school.state}-${school.type}`}
                role="option"
                aria-selected={i === highlighted}
                className="select-option"
                data-highlighted={i === highlighted}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  choose(school);
                }}
              >
                <span>{school.name}</span>
                <span className="text-text-3 text-xs">
                  {school.state} · {school.type}
                </span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-text-3 text-sm">
              {covered ? "No matches — keep typing, whatever you enter is saved." : "No dataset coverage yet for this country — whatever you enter is saved."}
            </li>
          )}
        </ul>
      )}
      <p className="text-text-3 text-xs mt-1">
        Suggestions from a directory of named U.S. high schools and colleges — don&rsquo;t see yours? Keep typing;
        whatever you enter is saved.
      </p>
    </div>
  );
}
