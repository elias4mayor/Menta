"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ALL_COUNTRIES, flagEmoji } from "@/lib/geo";
import { useDropdownPlacement } from "@/lib/use-dropdown-placement";

const MAX_RESULTS = 8;
// Real ITU-T E.164 ceiling: a full international number (country code +
// subscriber number) is never more than 15 digits. There's no single
// bundled dataset of each country's exact valid local-number length (that's
// what libphonenumber's metadata is for, and it's too large to vendor here
// honestly) — so validation is a real but coarser check: the total digit
// count fits E.164, and the local part is long enough to plausibly be a
// phone number, not a stricter per-country rule this app doesn't actually
// have data to enforce.
const E164_MAX_DIGITS = 15;
const MIN_LOCAL_DIGITS = 4;

/** Best-effort locale -> country-name guess, e.g. "en-US" -> "United States". */
function guessDialFromLocale(): string {
  if (typeof navigator === "undefined") return "+1";
  const region = new Intl.Locale(navigator.language || "en-US").maximize().region;
  const match = ALL_COUNTRIES.find((c) => c.code === region);
  return match?.dial ?? "+1";
}

function formatLocalNumber(dial: string, digits: string): string {
  // Light, honest formatting: only NANP (+1) gets the familiar
  // (555) 555-5555 grouping people expect; every other country just shows
  // the digits as typed rather than guessing at a grouping convention this
  // app doesn't have real data for.
  if (dial !== "+1") return digits;
  const d = digits.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Country-aware phone input: a searchable calling-code dropdown (by
 * country name or by the code itself) plus a number field, composing to a
 * single E.164 value ("+15551234567") passed to onChange — never spaces,
 * parens, or dashes in the stored value, those are display-only. Reuses
 * the same searchable-dropdown pattern as CountrySelect and the shared
 * useDropdownPlacement hook, not a second dropdown system.
 */
export function PhoneInput({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [dial, setDial] = useState<string>(() => {
    const match = value.match(/^\+\d+/);
    return match ? match[0].slice(0, 4) : guessDialFromLocale();
  });
  const [local, setLocal] = useState(() => value.replace(/^\+\d+/, "").replace(/\D/g, ""));

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedCountry = useMemo(() => ALL_COUNTRIES.find((c) => c.dial === dial), [dial]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES.slice(0, MAX_RESULTS);
    const byDial = ALL_COUNTRIES.filter((c) => c.dial.includes(q.replace(/[^0-9+]/g, "")));
    const byName = ALL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(q));
    const seen = new Set<string>();
    return [...byDial, ...byName].filter((c) => (seen.has(c.code) ? false : (seen.add(c.code), true))).slice(0, MAX_RESULTS);
  }, [query]);

  const showList = open && matches.length > 0;
  const { openUpward, maxHeight } = useDropdownPlacement(showList, rootRef);

  useEffect(() => {
    const digits = local.replace(/\D/g, "");
    onChange(digits ? `${dial}${digits}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dial, local]);

  function chooseDial(newDial: string) {
    setDial(newDial);
    setQuery("");
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
        chooseDial(matches[highlighted].dial);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const digitCount = dial.replace(/\D/g, "").length + local.length;
  const tooLong = digitCount > E164_MAX_DIGITS;
  const tooShort = local.length > 0 && local.length < MIN_LOCAL_DIGITS;

  return (
    <div className="phone-input">
      <div ref={rootRef} className="select-root phone-input-dial">
        <button
          type="button"
          className="field-select select-trigger"
          aria-haspopup="listbox"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-label="Country calling code"
          onClick={() => {
            setQuery("");
            setOpen((o) => !o);
          }}
        >
          <span>
            {selectedCountry ? flagEmoji(selectedCountry.code) : "🌐"} {dial}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="select-chevron">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {showList && (
          <div className={`select-panel phone-dial-panel${openUpward ? " select-panel-up" : ""}`} style={{ maxHeight }}>
            <input
              autoFocus
              className="field-input phone-dial-search"
              placeholder="Search country or code…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setOpen(false), 150);
              }}
            />
            <ul id={listboxId} role="listbox" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {matches.map((c, i) => (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={c.dial === dial}
                  className="select-option"
                  data-highlighted={i === highlighted}
                  onMouseEnter={() => setHighlighted(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    chooseDial(c.dial);
                  }}
                >
                  <span>{flagEmoji(c.code)} {c.name}</span>
                  <span className="text-text-3 text-xs">{c.dial}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        className="field-input phone-input-number"
        value={formatLocalNumber(dial, local)}
        placeholder="Phone number"
        onChange={(e) => setLocal(e.target.value.replace(/\D/g, "").slice(0, E164_MAX_DIGITS))}
        aria-invalid={tooLong || tooShort}
      />
    </div>
  );
}
