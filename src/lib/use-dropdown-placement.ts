"use client";

import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

const MIN_PANEL_HEIGHT = 120;
const EDGE_MARGIN = 12;
// The onboarding Continue/Back row is the one recurring case where the
// viewport genuinely has room but a real, clickable control sits well
// above the viewport's own bottom edge — everything else a dropdown might
// visually cover while open (another field, page content) is normal
// popover behavior, not something to shrink the panel for. This is a
// light, class-name-based check rather than a prop threaded through every
// caller; it's a no-op (falls back to plain viewport-edge math) anywhere
// .onb-nav doesn't exist, so it doesn't change behavior outside onboarding.
const KNOWN_BUTTON_ROW_SELECTOR = ".onb-nav";

export type DropdownPlacement = { openUpward: boolean; maxHeight: number };

/**
 * Decides whether a dropdown panel anchored to `rootRef` should open
 * upward instead of its default downward position, and how tall it's
 * allowed to be — real viewport-space measurement, not a fixed rule, so
 * it only flips when the panel actually wouldn't fit below (e.g. a
 * school/country dropdown near the bottom of a shorter viewport). The
 * height is clamped to whichever side it opens on, so the panel scrolls
 * its own option list (it already has overflow-y: auto) instead of
 * extending past the room it actually has. Re-measures every time the
 * dropdown opens, since the trigger's position on screen can change
 * between opens (page scroll, a resized window, a rotated device).
 */
export function useDropdownPlacement(
  open: boolean,
  rootRef: RefObject<HTMLElement | null>,
  panelMaxHeight = 260
): DropdownPlacement {
  const [placement, setPlacement] = useState<DropdownPlacement>({
    openUpward: false,
    maxHeight: panelMaxHeight,
  });

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      setPlacement({ openUpward: false, maxHeight: panelMaxHeight });
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    let belowLimit = window.innerHeight;
    const buttonRow = document.querySelector(KNOWN_BUTTON_ROW_SELECTOR);
    if (buttonRow) {
      const buttonTop = buttonRow.getBoundingClientRect().top;
      if (buttonTop > rect.bottom) belowLimit = Math.min(belowLimit, buttonTop);
    }
    const spaceBelow = belowLimit - rect.bottom - EDGE_MARGIN;
    const spaceAbove = rect.top - EDGE_MARGIN;
    // Only flip up when there's genuinely not enough room below AND
    // there's more usable room above — otherwise keep the default (a
    // cramped space on both sides is no better upside down).
    const openUpward = spaceBelow < panelMaxHeight && spaceAbove > spaceBelow;
    const available = openUpward ? spaceAbove : spaceBelow;
    setPlacement({ openUpward, maxHeight: Math.max(MIN_PANEL_HEIGHT, Math.min(panelMaxHeight, available)) });
  }, [open, rootRef, panelMaxHeight]);

  return placement;
}
