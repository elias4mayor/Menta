"use client";

import { useId, useMemo, useRef, useState } from "react";
import { countryCodeForName, statesForCountry } from "@/lib/geo";
import { useDropdownPlacement } from "@/lib/use-dropdown-placement";

const MAX_RESULTS = 8;

/**
 * Searchable state/province selector, scoped to whichever country name is
 * passed in — same combobox mechanics as CountrySelect (only a listed
 * value is accepted, not arbitrary text), built on the same
 * useDropdownPlacement + .select-panel/.select-option grammar.
 *
 * Countries without administrative divisions in the underlying dataset
 * (see ALL_STATES in src/lib/geo.ts) render a disabled, honestly-labeled
 * field instead of an always-empty searchable dropdown.
 */
export function StateSelect({
  id,
  country,
  value,
  onChange,
  placeholder = "Select a state / province",
}: {
  id?: string;
  country: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const countryCode = countryCodeForName(country);
  const options = useMemo(
    () => (countryCode ? statesForCountry(countryCode) : []),
    [countryCode]
  );

  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // The parent clears `value` when the selected country changes (country
  // determines which states are even valid) — keep the visible query text
  // in sync with that external reset. Adjusted during render (React's
  // documented pattern for this), not in an effect, so it takes effect on
  // the same render instead of causing an extra one.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, MAX_RESULTS);
    const starts = options.filter((s) => s.name.toLowerCase().startsWith(q));
    const includes = options.filter(
      (s) => !s.name.toLowerCase().startsWith(q) && s.name.toLowerCase().includes(q)
    );
    return [...starts, ...includes].slice(0, MAX_RESULTS);
  }, [query, options]);

  const showList = open && matches.length > 0;
  const { openUpward, maxHeight } = useDropdownPlacement(showList, rootRef);

  function choose(name: string) {
    onChange(name);
    setQuery(name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      if (matches[highlighted]) {
        e.preventDefault();
        choose(matches[highlighted].name);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!countryCode) {
    return (
      <input
        id={id}
        className="field-input"
        disabled
        placeholder="Select a country first"
      />
    );
  }

  if (options.length === 0) {
    return (
      <input
        id={id}
        className="field-input"
        disabled
        placeholder="No state/province data for this country"
      />
    );
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
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlighted(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => {
            setOpen(false);
            setQuery(value);
          }, 120);
        }}
        onKeyDown={handleKeyDown}
      />
      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          className={`select-panel${openUpward ? " select-panel-up" : ""}`}
          style={{ maxHeight }}
        >
          {matches.map((s, i) => (
            <li
              key={s.name}
              role="option"
              aria-selected={i === highlighted}
              className="select-option"
              data-highlighted={i === highlighted}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
                choose(s.name);
              }}
            >
              <span>{s.name}</span>
              {s.stateCode && <span className="text-text-3 text-xs">{s.stateCode}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
