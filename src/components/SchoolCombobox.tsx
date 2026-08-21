"use client";

import { useId, useMemo, useRef, useState } from "react";
import US_HIGH_SCHOOLS from "@/lib/data/us-high-schools.json";

type SchoolEntry = { name: string; state: string };
const SCHOOLS = US_HIGH_SCHOOLS as SchoolEntry[];

const MAX_RESULTS = 8;

function matchesFor(query: string): SchoolEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const startsWith: SchoolEntry[] = [];
  const includes: SchoolEntry[] = [];
  for (const school of SCHOOLS) {
    const name = school.name.toLowerCase();
    if (name.startsWith(q)) startsWith.push(school);
    else if (name.includes(q)) includes.push(school);
    if (startsWith.length >= MAX_RESULTS) break;
  }
  return [...startsWith, ...includes].slice(0, MAX_RESULTS);
}

/**
 * Free-text school field with search-as-you-type suggestions from a real
 * directory of named U.S. high schools — not every school in the country
 * (that dataset isn't reliably obtainable here), so this stays a plain
 * text input underneath: typing narrows the suggestion list, but any
 * value the athlete types is accepted as-is whether or not it matches
 * something in the directory.
 */
export function SchoolCombobox({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  const matches = useMemo(() => matchesFor(value), [value]);
  const showList = open && matches.length > 0;

  function choose(school: SchoolEntry) {
    onChange(school.name);
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
        choose(matches[highlighted]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="select-root">
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
          setHighlighted(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
      />
      {showList && (
        <ul id={listboxId} role="listbox" className="select-panel">
          {matches.map((school, i) => (
            <li
              key={`${school.name}-${school.state}`}
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
              <span className="text-text-3 text-xs">{school.state}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-text-3 text-xs mt-1">
        Suggestions from a directory of named U.S. high schools — don&rsquo;t see yours? Keep typing; whatever you enter is saved.
      </p>
    </div>
  );
}
