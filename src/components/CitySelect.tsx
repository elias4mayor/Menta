"use client";

import { useEffect, useId, useRef, useState } from "react";
import { countryCodeForName, statesForCountry } from "@/lib/geo";
import { useDropdownPlacement } from "@/lib/use-dropdown-placement";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

/**
 * Free-text city field with search-as-you-type suggestions from the real,
 * server-side City table (152,307 cities — never sent to the browser in
 * bulk, only the matching results for one query at a time via
 * /api/geo/cities). Like SchoolCombobox, this stays a plain text input
 * underneath: the dataset is large and real but not exhaustive, so
 * whatever the athlete types is accepted as-is even if it isn't one of
 * the suggestions.
 *
 * Gated by country/state exactly like the cascade requires: disabled
 * until a country is chosen, and — only for countries that actually have
 * real state data — disabled again until a state is chosen too. A
 * country with no state data in the real dataset (e.g. Vatican City)
 * skips straight to a country-scoped city search, which the API already
 * supports.
 */
export function CitySelect({
  id,
  country,
  state,
  value,
  onChange,
  placeholder = "Start typing your city…",
}: {
  id?: string;
  country: string;
  state: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const countryCode = countryCodeForName(country);
  const countryHasStates = countryCode ? statesForCountry(countryCode).length > 0 : false;
  const stateRequired = countryHasStates && !state;

  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const disabled = !countryCode || stateRequired;

  // Re-search whenever the query text, country, or state changes (a state
  // change while a city is already open should re-scope the results).
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (disabled || value.trim().length < MIN_QUERY_LENGTH) {
      return;
    }
    debounceTimer.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      const params = new URLSearchParams({ country, q: value.trim() });
      if (state) params.set("state", state);
      fetch(`/api/geo/cities?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setMatches(Array.isArray(data.cities) ? data.cities : []);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `disabled` is derived from country/state already in deps
  }, [value, country, state]);

  // Matches are only meaningful for the query that produced them — once the
  // field is disabled or the query is too short, treat stale results as
  // empty at render time rather than clearing state from inside the effect.
  const displayMatches = disabled || value.trim().length < MIN_QUERY_LENGTH ? [] : matches;
  const showList = open && !disabled && (loading || displayMatches.length > 0 || value.trim().length >= MIN_QUERY_LENGTH);
  const { openUpward, maxHeight } = useDropdownPlacement(showList, rootRef);

  function choose(name: string) {
    onChange(name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showList || displayMatches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % displayMatches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + displayMatches.length) % displayMatches.length);
    } else if (e.key === "Enter") {
      if (displayMatches[highlighted]) {
        e.preventDefault();
        choose(displayMatches[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!countryCode) {
    return <input id={id} className="field-input" disabled placeholder="Select a country first" />;
  }
  if (stateRequired) {
    return <input id={id} className="field-input" disabled placeholder="Select a state/province first" />;
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
          ) : displayMatches.length > 0 ? (
            displayMatches.map((name, i) => (
              <li
                key={name}
                role="option"
                aria-selected={i === highlighted}
                className="select-option"
                data-highlighted={i === highlighted}
                onMouseEnter={() => setHighlighted(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  choose(name);
                }}
              >
                <span>{name}</span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-text-3 text-sm">No matches — keep typing, whatever you enter is saved.</li>
          )}
        </ul>
      )}
    </div>
  );
}
