"use client";

import { useEffect, useRef, useState } from "react";
import { useDropdownPlacement } from "@/lib/use-dropdown-placement";

export type SelectOption = { value: string; label: string; disabled?: boolean };

/**
 * Custom-styled dropdown replacing the browser's native <select> popup,
 * which can't be restyled (it renders as an OS-level menu regardless of
 * CSS). Same field-select look at rest, but the open panel matches the
 * rest of the design system: rounded, elevated, with a highlighted
 * current selection. Implements the standard listbox-button keyboard
 * pattern (arrows to move, Enter/Space to choose, Escape to close).
 */
export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value);
  const { openUpward, maxHeight } = useDropdownPlacement(open, rootRef);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      listRef.current?.children[highlighted]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, highlighted]);

  function openList() {
    const idx = options.findIndex((o) => o.value === value);
    setHighlighted(idx >= 0 ? idx : 0);
    setOpen(true);
  }

  function nextEnabled(from: number, dir: 1 | -1): number {
    let i = from;
    for (let step = 0; step < options.length; step++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlighted((h) => nextEnabled(h, e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        openList();
      } else {
        const opt = options[highlighted];
        if (opt && !opt.disabled) {
          onChange(opt.value);
          setOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
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
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className={selected ? "" : "text-text-3"}>{selected ? selected.label : placeholder ?? "Select…"}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="select-chevron">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className={`select-panel${openUpward ? " select-panel-up" : ""}`}
          style={{ maxHeight }}
          aria-activedescendant={id ? `${id}-opt-${highlighted}` : undefined}
        >
          {options.map((opt, i) => (
            <li
              key={opt.value}
              id={id ? `${id}-opt-${i}` : undefined}
              role="option"
              aria-selected={opt.value === value}
              aria-disabled={opt.disabled}
              className="select-option"
              data-highlighted={i === highlighted}
              data-disabled={opt.disabled}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => {
                if (opt.disabled) return;
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
