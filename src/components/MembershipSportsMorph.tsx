"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type MembershipSportsMorphHandle = {
  /** Called every scroll frame from MembershipExperience's existing rAF
   * loop — no new scroll listener, no React re-render, same imperative-
   * custom-property discipline as the tier-node wheel itself. */
  applyProgress: (progress: number) => void;
};

const SPORT_COUNT = 6;

/**
 * The same white disc, six sports living inside its linework. All six
 * layers sit in one SVG, always mounted — a sport's "identity" is
 * opacity + a stroke-draw reveal on its signature line, cross-fading
 * into the next as scroll progress moves through its window. Never
 * unmounts/remounts a layer, so there's no "icon disappears, next icon
 * appears" cut — only continuous dissolve. Both ends of the scroll range
 * (first/last ~6%) have every layer at opacity 0, which is the plain
 * white disc doing the "clean MENTA circle" bookend on its own — no
 * separate base-circle markup needed.
 *
 * Coordinate system: the disc's own true center sits far off-screen to
 * the left (the whole wheel deliberately bleeds off-screen — see
 * .membership-wheel-disc's negative --disc-left). Only the disc's
 * rightmost ~30–35% width (its rim, on desktop/tablet — more of it on
 * mobile) is ever actually visible. Every sport is authored in a small
 * local design space (roughly ±28 units around its own origin) and
 * placed with one uniform translate into that visible rim — never a
 * non-uniform scale, which distorts curve symmetry (an earlier version
 * of this squashed the whole 200-unit disc into the rim and it visibly
 * ruined the baseball/basketball arcs' symmetry).
 *
 * Ink is dark-on-white (the disc itself is white/off-white) — fine-line
 * engraving/stitching detail on a light surface, not literal
 * "white geometry," which would be invisible against the disc's own
 * background.
 */
export const MembershipSportsMorph = forwardRef<MembershipSportsMorphHandle>(function MembershipSportsMorph(_props, forwardedRef) {
  const groupRefs = useRef<(SVGGElement | null)[]>([]);
  const drawPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const pathLengths = useRef<number[]>([]);

  useImperativeHandle(forwardedRef, () => ({
    applyProgress(progress: number) {
      const introEnd = 0.06;
      const outroStart = 0.94;
      const span = outroStart - introEnd;
      const windowWidth = span / SPORT_COUNT;

      for (let i = 0; i < SPORT_COUNT; i++) {
        const centerP = introEnd + (i + 0.5) * windowWidth;
        const dist = Math.abs(progress - centerP) / (windowWidth * 0.72);
        const t = Math.min(Math.max(1 - dist, 0), 1);
        // Smoothstep — the FADE easing; t itself (pre-smoothstep) drives
        // the line-draw amount so the stroke visibly finishes drawing
        // right as the fade reaches full opacity.
        const eased = t * t * (3 - 2 * t);

        const g = groupRefs.current[i];
        if (g) g.style.opacity = eased.toFixed(3);

        const path = drawPathRefs.current[i];
        if (path) {
          // Measured lazily, on first use here, rather than at mount
          // (inside the ref callback) — getTotalLength() called too
          // early, before the SVG has committed real layout, can return
          // 0 in some timing conditions; a cached 0 is falsy forever
          // after, permanently skipping this path's updates and leaving
          // it stuck on a degenerate dasharray="0" (which Chrome renders
          // as fully invisible, not the "solid line" a literal reading
          // of the spec might suggest). By the time a scroll-driven
          // update fires at all, layout is guaranteed settled.
          let len = pathLengths.current[i];
          if (!len) {
            len = path.getTotalLength();
            pathLengths.current[i] = len;
            path.style.strokeDasharray = String(len);
          }
          path.style.strokeDashoffset = (len * (1 - t)).toFixed(2);
        }
      }
    },
  }));

  function registerDrawPath(el: SVGPathElement | null, index: number) {
    // Just stores the ref — length is measured lazily in applyProgress,
    // see the comment there for why not here.
    drawPathRefs.current[index] = el;
  }

  return (
    <svg viewBox="0 0 200 200" className="membership-sports-morph-svg" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {/* Local design space is roughly (-28,-28) to (28,28) around each
          group's own origin; this one translate places that origin at
          (172,100) — inside the visible rim at every breakpoint. */}
      <g transform="translate(172,100)">
        {/* 01 — Softball: one soft, open seam */}
        <g
          ref={(el) => {
            groupRefs.current[0] = el;
          }}
          className="membership-sports-morph-layer"
        >
          <path d="M-22,18 C-6,-12 12,18 24,-12" className="membership-sports-morph-line" ref={(el) => registerDrawPath(el, 0)} />
          <g className="membership-sports-morph-ticks">
            <line x1="-15" y1="6" x2="-11" y2="1" />
            <line x1="-4" y1="-7" x2="0" y2="-11" />
            <line x1="6" y1="-6" x2="10" y2="-10" />
            <line x1="16" y1="4" x2="12" y2="9" />
          </g>
        </g>

        {/* 02 — Baseball: the classic paired seam */}
        <g
          ref={(el) => {
            groupRefs.current[1] = el;
          }}
          className="membership-sports-morph-layer"
        >
          <path d="M0,-26 C-20,-14 -20,14 0,26" className="membership-sports-morph-line" ref={(el) => registerDrawPath(el, 1)} />
          <path d="M0,-26 C20,-14 20,14 0,26" className="membership-sports-morph-line" />
          <g className="membership-sports-morph-ticks">
            <line x1="-16" y1="-15" x2="-9" y2="-13" />
            <line x1="-19" y1="0" x2="-11" y2="0" />
            <line x1="-16" y1="15" x2="-9" y2="13" />
            <line x1="16" y1="-15" x2="9" y2="-13" />
            <line x1="19" y1="0" x2="11" y2="0" />
            <line x1="16" y1="15" x2="9" y2="13" />
          </g>
        </g>

        {/* 03 — Football: center lace + curved panel seams */}
        <g
          ref={(el) => {
            groupRefs.current[2] = el;
          }}
          className="membership-sports-morph-layer"
        >
          <path d="M0,-20 L0,20" className="membership-sports-morph-line" ref={(el) => registerDrawPath(el, 2)} />
          <g className="membership-sports-morph-ticks">
            <line x1="-6" y1="-12" x2="6" y2="-12" />
            <line x1="-6" y1="-4" x2="6" y2="-4" />
            <line x1="-6" y1="4" x2="6" y2="4" />
            <line x1="-6" y1="12" x2="6" y2="12" />
          </g>
          <path d="M-16,-20 Q0,-30 16,-20" className="membership-sports-morph-line" />
          <path d="M-16,20 Q0,30 16,20" className="membership-sports-morph-line" />
        </g>

        {/* 04 — Volleyball: three curved panels radiating out */}
        <g
          ref={(el) => {
            groupRefs.current[3] = el;
          }}
          className="membership-sports-morph-layer"
        >
          <path d="M0,0 C0,-16 -14,-24 -26,-22" className="membership-sports-morph-line" ref={(el) => registerDrawPath(el, 3)} />
          <path d="M0,0 C14,4 26,-4 28,-20" className="membership-sports-morph-line" />
          <path d="M0,0 C-4,16 6,25 0,29" className="membership-sports-morph-line" />
        </g>

        {/* 05 — Basketball: the classic four-line seam */}
        <g
          ref={(el) => {
            groupRefs.current[4] = el;
          }}
          className="membership-sports-morph-layer"
        >
          <path d="M0,-26 L0,26" className="membership-sports-morph-line" ref={(el) => registerDrawPath(el, 4)} />
          <path d="M-26,0 L26,0" className="membership-sports-morph-line" />
          <path d="M0,-26 C-18,-14 -18,14 0,26" className="membership-sports-morph-line" />
          <path d="M0,-26 C18,-14 18,14 0,26" className="membership-sports-morph-line" />
        </g>

        {/* 06 — Soccer: a center panel with radiating edges */}
        <g
          ref={(el) => {
            groupRefs.current[5] = el;
          }}
          className="membership-sports-morph-layer"
        >
          <path
            d="M0,-16 L15.2,-4.9 L9.4,12.9 L-9.4,12.9 L-15.2,-4.9 Z"
            className="membership-sports-morph-line"
            ref={(el) => registerDrawPath(el, 5)}
          />
          <g className="membership-sports-morph-ticks">
            <line x1="0" y1="-16" x2="0" y2="-27" />
            <line x1="15.2" y1="-4.9" x2="25" y2="-8.2" />
            <line x1="9.4" y1="12.9" x2="15.5" y2="21.4" />
            <line x1="-9.4" y1="12.9" x2="-15.5" y2="21.4" />
            <line x1="-15.2" y1="-4.9" x2="-25" y2="-8.2" />
          </g>
        </g>
      </g>
    </svg>
  );
});
