"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PricingCheckoutButton } from "@/components/PricingCheckoutButton";
import { PartnershipContactForm } from "@/components/PartnershipContactForm";
import type { ResolvedMembershipTier } from "@/lib/membership";
import { formatPrice } from "@/lib/membership-format";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { MembershipSportsMorph, type MembershipSportsMorphHandle } from "@/components/MembershipSportsMorph";

const TEAM_FLOW = ["Coach", "Program", "Live", "Athletes", "Performance"];

/**
 * The three tiers the membership brief treats as "the ladder" — UNDERDOG
 * (foundation) → MVP (hero) → ONYX (elite). ROOKIE and TEAM are real,
 * fully-priced tiers wired to the same Stripe/entitlement system (see
 * membership-config.ts), but they're categorically different — a free
 * on-ramp and a separate B2B/team product — not further rungs on this
 * ladder. Kept as a plain ordered array (not a Set) so indexOf can double
 * as "which numbered stop is this."
 */
const CORE_TIER_KEYS = ["UNDERDOG", "MVP", "ONYX"];

/**
 * "01"/"02"/"03" for the three-tier progression the brief describes;
 * ROOKIE and TEAM get a category label instead of a number, so they read
 * as sitting outside that ladder rather than competing as steps 0 and 5.
 */
function tierEyebrowMark(key: string): string {
  const coreIndex = CORE_TIER_KEYS.indexOf(key);
  if (coreIndex !== -1) return String(coreIndex + 1).padStart(2, "0");
  if (key === "ROOKIE") return "FREE TO START";
  if (key === "TEAM") return "FOR TEAMS & ORGS";
  return "";
}

/**
 * The wheel is a circle whose center sits at (centerX, 0) relative to an
 * anchor pinned to the vertical middle of the left edge of the stage
 * (`left: 0; top: 50%` on .membership-wheel). `centerX` is deliberately
 * negative on desktop/tablet — the circle's center is off-screen to the
 * left, so only its right-hand rim (near angle 0) is ever visible, which
 * is what makes it read as "a giant disc entering from outside the
 * viewport" rather than a bounded carousel. On mobile there's no bleed:
 * `centerX`/`radius` are small fixed pixel values that keep the whole
 * circle inside the viewport per the brief's "never break outside the
 * viewport" mobile rule.
 */
type Geometry = {
  radius: number;
  centerX: number;
  stepDeg: number;
  scaleFalloff: number;
  opacityFalloff: number;
  blurMax: number;
};

function getGeometry(vw: number): Geometry {
  if (vw <= 640) {
    return { radius: 78, centerX: 40, stepDeg: 34, scaleFalloff: 0.55, opacityFalloff: 0.7, blurMax: 2 };
  }
  if (vw <= 1024) {
    const radius = vw * 0.62;
    return { radius, centerX: vw * 0.34 - radius, stepDeg: 19, scaleFalloff: 0.44, opacityFalloff: 0.68, blurMax: 5 };
  }
  const radius = vw * 0.58;
  return { radius, centerX: vw * 0.4 - radius, stepDeg: 16, scaleFalloff: 0.42, opacityFalloff: 0.65, blurMax: 6 };
}


/**
 * The cinematic membership selector: a scroll-driven half-wheel of 5
 * nodes (same imperative-custom-property technique as .portal-hero in
 * globals.css — see PortalHero.tsx — so scrolling never triggers a React
 * re-render of the wheel itself). Falls back to a plain stacked list of
 * full tier cards under prefers-reduced-motion, with zero spatial/scroll
 * behavior — same data, no motion. Either way, every tier is also always
 * reachable via the plain tablist buttons beneath the wheel; the wheel is
 * never the only way to navigate.
 */
export function MembershipExperience({ tiers, isSignedIn }: { tiers: ResolvedMembershipTier[]; isSignedIn: boolean }) {
  const reducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const morphRef = useRef<MembershipSportsMorphHandle>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const geometryRef = useRef<Geometry>(getGeometry(1440));

  useEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let ticking = false;
    let lastActive = 0;

    function applyGeometry(progress: number) {
      const { radius, centerX, stepDeg, scaleFalloff, opacityFalloff, blurMax } = geometryRef.current;
      const rotation = progress * (tiers.length - 1) * stepDeg;
      let nearest = 0;
      let nearestDist = Infinity;

      tiers.forEach((_, i) => {
        const angleDeg = i * stepDeg - rotation;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = centerX + radius * Math.cos(angleRad);
        const y = radius * Math.sin(angleRad);
        const distSteps = Math.abs(angleDeg) / stepDeg;
        const t = Math.min(Math.max(distSteps / 2, 0), 1);
        // Active node (t=0) scales slightly ABOVE 1 — "slightly closer to
        // the viewer" per the brief — falling off below 1 for neighbors.
        const scale = 1.06 - t * scaleFalloff;
        const opacity = 1 - t * opacityFalloff;
        const blur = t * blurMax;

        const el = nodeRefs.current[i];
        if (el) {
          el.style.setProperty("--node-x", `${x.toFixed(1)}px`);
          el.style.setProperty("--node-y", `${y.toFixed(1)}px`);
          el.style.setProperty("--node-scale", scale.toFixed(3));
          el.style.setProperty("--node-opacity", opacity.toFixed(3));
          el.style.setProperty("--node-blur", `${blur.toFixed(2)}px`);
        }
        if (Math.abs(angleDeg) < nearestDist) {
          nearestDist = Math.abs(angleDeg);
          nearest = i;
        }
      });

      if (nearest !== lastActive) {
        lastActive = nearest;
        setActiveIndex(nearest);
      }
    }

    function update() {
      ticking = false;
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = -rect.top;
      const progress = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;
      applyGeometry(progress);
      // Same scroll-driven progress already computed above, reused for
      // the sports-morph linework — no second listener, no re-render.
      morphRef.current?.applyProgress(progress);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function onResize() {
      const geometry = getGeometry(window.innerWidth);
      geometryRef.current = geometry;
      const disc = discRef.current;
      if (disc) {
        disc.style.setProperty("--disc-size", `${(geometry.radius * 2).toFixed(1)}px`);
        disc.style.setProperty("--disc-left", `${(geometry.centerX - geometry.radius).toFixed(1)}px`);
      }
      update();
    }

    onResize();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion, tiers]);

  function jumpTo(index: number) {
    const wrap = wrapRef.current;
    if (!wrap || reducedMotion) {
      setActiveIndex(index);
      return;
    }
    const rect = wrap.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const targetProgress = index / (tiers.length - 1);
    const targetY = window.scrollY + rect.top + targetProgress * total;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }

  function moveFocusAndJump(target: number) {
    jumpTo(target);
    // jumpTo only scrolls/updates activeIndex — focus has to move
    // explicitly too, or arrow-key navigation silently leaves keyboard
    // focus behind on the node the user started on.
    nodeRefs.current[target]?.focus();
  }

  function onNodeKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      moveFocusAndJump(Math.min(index + 1, tiers.length - 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      moveFocusAndJump(Math.max(index - 1, 0));
    }
  }

  const active = tiers[activeIndex];

  if (reducedMotion) {
    return (
      <div className="live-root">
        <MembershipHero />
        <div className="membership-fallback-list">
          {tiers.map((tier) => (
            <TierCard key={tier.key} tier={tier} isSignedIn={isSignedIn} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="live-root">
      <MembershipHero />

      <div ref={wrapRef} className="membership-wheel-wrap">
        <div className="membership-wheel-stage">
          <div className="membership-wheel" role="group" aria-label="Membership tiers">
            <div ref={discRef} className="membership-wheel-disc" aria-hidden="true">
              <MembershipSportsMorph ref={morphRef} />
            </div>
            {tiers.map((tier, i) => (
              <button
                key={tier.key}
                ref={(el) => {
                  nodeRefs.current[i] = el;
                }}
                type="button"
                className="membership-node"
                aria-current={i === activeIndex}
                aria-label={`${tier.displayName} — ${tier.positioning}`}
                onClick={() => jumpTo(i)}
                onKeyDown={(e) => onNodeKeyDown(e, i)}
              >
                <span className="membership-node-label">{tier.displayName}</span>
                <span className="membership-node-dot" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div
            className={`membership-detail${CORE_TIER_KEYS.includes(active.key) ? "" : " membership-detail-secondary"}`}
            key={active.key}
          >
            <div className="live-eyebrow">{tierEyebrowMark(active.key)}</div>
            {active.key === "TEAM" ? (
              <TeamDetail tier={active} />
            ) : (
              <IndividualDetail tier={active} isSignedIn={isSignedIn} />
            )}
          </div>
        </div>
      </div>

      <nav aria-label="Jump to a membership tier" className="membership-tablist">
        {tiers.map((tier, i) => (
          <button
            key={tier.key}
            type="button"
            className="live-ghost-btn"
            aria-current={i === activeIndex}
            onClick={() => jumpTo(i)}
          >
            {tier.displayName}
          </button>
        ))}
      </nav>
    </div>
  );
}

function MembershipHero() {
  return (
    <section className="live-shell membership-hero">
      <div className="live-eyebrow">MENTA MEMBERSHIP</div>
      <h1 className="live-focal-title">Choose your level.</h1>
      <p className="live-sub">Your development. Your system. Your next level.</p>
      <div className="membership-scroll-cue">
        Scroll <span className="membership-scroll-cue-arrow">↓</span>
      </div>
    </section>
  );
}

function IndividualDetail({ tier, isSignedIn }: { tier: ResolvedMembershipTier; isSignedIn: boolean }) {
  const priced = formatPrice(tier);
  // ROOKIE is a real, fully-priced ($0) tier — not a lesser version of
  // UNDERDOG/MVP/ONYX, just a different category (the free on-ramp). A
  // smaller title + ghost CTA keeps it from visually competing with the
  // three-tier ladder's hero treatment.
  const secondary = !CORE_TIER_KEYS.includes(tier.key);
  return (
    <>
      <div className="live-eyebrow">{tier.positioning.toUpperCase()}</div>
      <h2 className="live-focal-title" style={{ fontSize: secondary ? "clamp(26px, 4.5vw, 38px)" : "clamp(32px, 6vw, 52px)" }}>
        {tier.displayName}
      </h2>
      <p className="live-sub">{tier.description}</p>

      <ul className="membership-benefits">
        {tier.benefits.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      {priced && (
        <div className="membership-price">
          {priced.price}
          {priced.period && <span className="membership-price-period">{priced.period}</span>}
        </div>
      )}

      <div className="membership-cta">
        <TierCta tier={tier} isSignedIn={isSignedIn} ghost={secondary} />
      </div>
    </>
  );
}

function TeamDetail({ tier }: { tier: ResolvedMembershipTier }) {
  return (
    <>
      <div className="live-eyebrow">{tier.positioning.toUpperCase()}</div>
      <h2 className="live-focal-title" style={{ fontSize: "clamp(26px, 4.5vw, 38px)" }}>
        {tier.displayName}
      </h2>
      <p className="live-sub">{tier.description}</p>

      <div className="membership-team-flow" aria-hidden="true">
        {TEAM_FLOW.map((step, i) => (
          <span key={step}>
            {step}
            {i < TEAM_FLOW.length - 1 && <span className="membership-team-flow-sep"> → </span>}
          </span>
        ))}
      </div>

      <div className="membership-cta">
        <TierCta tier={tier} isSignedIn={Boolean(tier)} ghost />
      </div>
    </>
  );
}

export function TierCta({ tier, isSignedIn, ghost = false }: { tier: ResolvedMembershipTier; isSignedIn: boolean; ghost?: boolean }) {
  const primaryClass = ghost ? "live-ghost-btn" : "live-primary-btn";
  switch (tier.cta.kind) {
    case "already-on-team":
      return (
        <p className="live-sub" style={{ marginTop: 0 }}>
          You&rsquo;re already on <strong>{tier.cta.teamName}</strong> ({tier.cta.teamRole.toLowerCase()}).
        </p>
      );
    case "team-contact":
      return (
        <details>
          <summary className={primaryClass} style={{ cursor: "pointer", listStyle: "none", display: "inline-flex" }}>
            Build your team →
          </summary>
          <div style={{ marginTop: 20, textAlign: "left", maxWidth: 360 }}>
            <PartnershipContactForm defaultInterest="Team" />
          </div>
        </details>
      );
    case "current":
      return (
        <button className="live-ghost-btn" disabled>
          Current plan
        </button>
      );
    case "manage":
      return (
        <Link href="/account/billing" className="live-ghost-btn">
          Manage membership
        </Link>
      );
    case "coming-soon":
      return (
        <button className="live-ghost-btn" disabled>
          Pricing coming soon
        </button>
      );
    case "upgrade":
    case "signed-out":
    default:
      return (
        <PricingCheckoutButton
          planKey={tier.key}
          isSignedIn={isSignedIn}
          isCurrentPlan={false}
          isFree={tier.key === "ROOKIE"}
          className={primaryClass}
        >
          {tier.key === "ROOKIE" ? "Start free" : `Upgrade to ${tier.displayName} →`}
        </PricingCheckoutButton>
      );
  }
}

function TierCard({ tier, isSignedIn }: { tier: ResolvedMembershipTier; isSignedIn: boolean }) {
  const priced = formatPrice(tier);
  return (
    <div className="live-card p-6">
      <div className="live-eyebrow">{tier.positioning.toUpperCase()}</div>
      <h2 className="text-2xl font-semibold" style={{ color: "var(--text-1)", marginTop: 6 }}>
        {tier.displayName}
      </h2>
      <p className="live-sub" style={{ textAlign: "left" }}>
        {tier.description}
      </p>
      {tier.key === "TEAM" ? (
        <div className="membership-team-flow" style={{ justifyContent: "flex-start" }} aria-hidden="true">
          {TEAM_FLOW.join(" → ")}
        </div>
      ) : (
        <ul className="membership-benefits" style={{ alignItems: "flex-start" }}>
          {tier.benefits.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      {priced && (
        <div className="membership-price" style={{ textAlign: "left" }}>
          {priced.price}
          {priced.period && <span className="membership-price-period">{priced.period}</span>}
        </div>
      )}
      <div className="membership-cta" style={{ alignItems: "flex-start" }}>
        <TierCta tier={tier} isSignedIn={isSignedIn} />
      </div>
    </div>
  );
}

