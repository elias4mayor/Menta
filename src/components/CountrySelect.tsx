"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ALL_COUNTRIES, flagEmoji } from "@/lib/geo";
import { useDropdownPlacement } from "@/lib/use-dropdown-placement";

const MAX_RESULTS = 8;

/**
 * Searchable country selector — real ISO-3166-1 country list, flag shown
 * via computed regional-indicator emoji (no image assets, no network
 * call). Unlike SchoolCombobox this only accepts a listed country: the
 * value is always one of ALL_COUNTRIES' names, since "country" isn't a
 * freeform field the way a school name can be.
 */
export function CountrySelect({
  id,
  value,
  onChange,
  placeholder = "Select a country",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES.slice(0, MAX_RESULTS);
    const starts = ALL_COUNTRIES.filter((c) => c.name.toLowerCase().startsWith(q));
    const includes = ALL_COUNTRIES.filter((c) => !c.name.toLowerCase().startsWith(q) && c.name.toLowerCase().includes(q));
    return [...starts, ...includes].slice(0, MAX_RESULTS);
  }, [query]);

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
            // A country must be a real selection, not arbitrary text —
            // revert to the last confirmed value if nothing was chosen.
            setQuery(value);
          }, 120);
        }}
        onKeyDown={handleKeyDown}
      />
      {showList && (
        <ul id={listboxId} role="listbox" className={`select-panel${openUpward ? " select-panel-up" : ""}`} style={{ maxHeight }}>
          {matches.map((c, i) => (
            <li
              key={c.code}
              role="option"
              aria-selected={i === highlighted}
              className="select-option"
              data-highlighted={i === highlighted}
              onMouseEnter={() => setHighlighted(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                if (blurTimer.current) clearTimeout(blurTimer.current);
                choose(c.name);
              }}
            >
              <span>{flagEmoji(c.code)} {c.name}</span>
              <span className="text-text-3 text-xs">{c.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
