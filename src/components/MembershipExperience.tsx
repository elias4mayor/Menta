"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PricingCheckoutButton } from "@/components/PricingCheckoutButton";
import { PartnershipContactForm } from "@/components/PartnershipContactForm";
import type { ResolvedMembershipTier } from "@/lib/membership";

const TEAM_FLOW = ["Coach", "Program", "Live", "Athletes", "Performance"];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** SSR has no window; assume motion is allowed for the initial server render (matches PortalHero's own default-to-finished-state fallback), then useSyncExternalStore corrects it right after hydration if the real preference differs — the sanctioned way to read browser-only state without setState-in-effect. */
function getReducedMotionServerSnapshot(): boolean {
  return false;
}

type Geometry = { radius: number; stepDeg: number; centerBelowPx: number };

function getGeometry(width: number): Geometry {
  if (width <= 640) return { radius: 190, stepDeg: 28, centerBelowPx: 70 };
  if (width <= 1024) return { radius: 320, stepDeg: 25, centerBelowPx: 120 };
  return { radius: 460, stepDeg: 22, centerBelowPx: 170 };
}

function formatPrice(tier: ResolvedMembershipTier): { price: string; period: string } | null {
  if (tier.isCustomPricing) return { price: "Custom", period: "" };
  if (tier.priceCents === null) return null; // e.g. ONYX pre-launch — handled as its own "coming soon" state
  if (tier.priceCents === 0) return { price: "$0", period: "" };
  return { price: `$${(tier.priceCents / 100).toFixed(2)}`, period: "/mo" };
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
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const geometryRef = useRef<Geometry>({ radius: 460, stepDeg: 22, centerBelowPx: 170 });

  useEffect(() => {
    if (reducedMotion) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let ticking = false;
    let lastActive = 0;

    function applyGeometry(progress: number) {
      const { radius, stepDeg, centerBelowPx } = geometryRef.current;
      const rotation = progress * (tiers.length - 1) * stepDeg;
      let nearest = 0;
      let nearestDist = Infinity;

      tiers.forEach((_, i) => {
        const angleDeg = i * stepDeg - rotation;
        const angleRad = (angleDeg * Math.PI) / 180;
        const x = radius * Math.sin(angleRad);
        const y = centerBelowPx - radius * Math.cos(angleRad);
        const distSteps = Math.abs(angleDeg) / stepDeg;
        const t = Math.min(Math.max(distSteps / 2, 0), 1);
        const scale = 1 - t * 0.4;
        const opacity = 1 - t * 0.65;

        const el = nodeRefs.current[i];
        if (el) {
          el.style.setProperty("--node-x", `${x.toFixed(1)}px`);
          el.style.setProperty("--node-y", `${y.toFixed(1)}px`);
          el.style.setProperty("--node-scale", scale.toFixed(3));
          el.style.setProperty("--node-opacity", opacity.toFixed(3));
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
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function onResize() {
      geometryRef.current = getGeometry(window.innerWidth);
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
          <div className="membership-detail" key={active.key}>
            <div className="live-eyebrow">
              {activeIndex + 1} OF {tiers.length}
            </div>
            {active.key === "TEAM" ? (
              <TeamDetail tier={active} />
            ) : (
              <IndividualDetail tier={active} isSignedIn={isSignedIn} />
            )}
          </div>

          <div className="membership-wheel" role="group" aria-label="Membership tiers">
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
                <span className="membership-node-dot" aria-hidden="true" />
                <span className="membership-node-label">{tier.displayName}</span>
              </button>
            ))}
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
  return (
    <>
      <div className="live-eyebrow">{tier.positioning.toUpperCase()}</div>
      <h2 className="live-focal-title" style={{ fontSize: "clamp(32px, 6vw, 52px)" }}>
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
        <TierCta tier={tier} isSignedIn={isSignedIn} />
      </div>
    </>
  );
}

function TeamDetail({ tier }: { tier: ResolvedMembershipTier }) {
  return (
    <>
      <div className="live-eyebrow">{tier.positioning.toUpperCase()}</div>
      <h2 className="live-focal-title" style={{ fontSize: "clamp(32px, 6vw, 52px)" }}>
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
        <TierCta tier={tier} isSignedIn={Boolean(tier)} />
      </div>
    </>
  );
}

function TierCta({ tier, isSignedIn }: { tier: ResolvedMembershipTier; isSignedIn: boolean }) {
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
          <summary className="live-primary-btn" style={{ cursor: "pointer", listStyle: "none", display: "inline-flex" }}>
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
          className="live-primary-btn"
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

