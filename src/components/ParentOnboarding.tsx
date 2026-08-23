"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";
import { MultiSelect } from "@/components/MultiSelect";
import { CountrySelect } from "@/components/CountrySelect";
import { StateSelect } from "@/components/StateSelect";
import { CitySelect } from "@/components/CitySelect";
import { PhoneInput } from "@/components/PhoneInput";
import { GuardianLinks } from "@/components/GuardianLinks";
import { OnboardingBuildingStep } from "@/components/OnboardingBuildingStep";
import { GOAL_OPTIONS, GOAL_QUESTION, GOALS_MAX } from "@/lib/goals";

export const RELATIONSHIPS = ["Parent", "Guardian", "Other"];
const TRANSITION_MS = 260;
// See BUILD_MIN_MS in OnboardingExperience.tsx / CoachOnboarding.tsx.
const BUILD_MIN_MS = 6800;

/**
 * Parent/guardian onboarding — Phase 1 scope. Saves a real ParentProfile
 * via /api/onboarding/parent, then reuses the existing GuardianLinks
 * component (src/app/api/guardian) for connecting to an athlete — that
 * request/approve flow already exists and works; onboarding just surfaces
 * it as a step instead of only living in Settings.
 */
export function ParentOnboarding({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.split(" ")[0];

  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [country, setCountry] = useState("United States");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [step, setStep] = useState<"info" | "building" | "connect">("info");
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCountryChange(next: string) {
    setCountry(next);
    setState("");
    setCity("");
  }

  function handleStateChange(next: string) {
    setState(next);
    setCity("");
  }

  function goToBuilding() {
    setPhase("exit");
    transitionTimer.current = setTimeout(() => {
      setStep("building");
      setPhase("enter");
    }, TRANSITION_MS);
  }

  function goToConnect() {
    setPhase("exit");
    transitionTimer.current = setTimeout(() => {
      setStep("connect");
      setPhase("enter");
    }, TRANSITION_MS);
  }

  useEffect(() => {
    if (step !== "building") return;
    const buildTimer = setTimeout(goToConnect, BUILD_MIN_MS);
    return () => clearTimeout(buildTimer);
  }, [step]);

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || undefined,
          relationship: relationship || undefined,
          country: country || undefined,
          state: state || undefined,
          city: city || undefined,
          goals,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      goToBuilding();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function enterDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="onb-root">
      <div className="onb-ambient" aria-hidden="true" />
      <Image src="/logo.png" alt="MENTA" width={863} height={194} className="onb-logo onb-logo-settled" priority />

      <div className="onb-stage" style={{ maxWidth: 520 }}>
        <div key={step} className={`onb-content ${phase === "exit" ? "onb-exit" : "onb-enter"}`}>
          {step === "info" ? (
            <>
              <h1 className="onb-title">Let&rsquo;s get you connected.</h1>
              <p className="onb-subtitle">{`${firstName}, stay connected to the athlete without adding more noise.`}</p>

              <form onSubmit={saveProfile} className="onb-fields space-y-4">
                <div>
                  <label className="field-label" htmlFor="parent-relationship">Relationship to athlete</label>
                  <Select
                    id="parent-relationship"
                    value={relationship}
                    onChange={setRelationship}
                    placeholder="Select one"
                    options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="parent-country">Country</label>
                    <CountrySelect id="parent-country" value={country} onChange={handleCountryChange} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="parent-state">State / province</label>
                    <StateSelect id="parent-state" country={country} value={state} onChange={handleStateChange} />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="parent-city">City</label>
                  <CitySelect id="parent-city" country={country} state={state} value={city} onChange={setCity} />
                </div>
                <div>
                  <label className="field-label" htmlFor="parent-phone">Phone</label>
                  <PhoneInput id="parent-phone" value={phone} onChange={setPhone} />
                </div>
                <div>
                  <label className="field-label" htmlFor="parent-goals">{GOAL_QUESTION.PARENT}</label>
                  <MultiSelect
                    id="parent-goals"
                    options={GOAL_OPTIONS.PARENT}
                    value={goals}
                    onChange={setGoals}
                    max={GOALS_MAX}
                    placeholder="Select your goals"
                    searchPlaceholder="Search goals…"
                  />
                </div>

                {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

                <div className="onb-actions">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? "Saving…" : "Continue"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : step === "building" ? (
            <OnboardingBuildingStep role="PARENT" durationMs={BUILD_MIN_MS} />
          ) : (
            <>
              <h1 className="onb-title">Connect your athlete</h1>
              <p className="onb-subtitle">
                Send a request to the email on their MENTA account. They&rsquo;ll need to approve it before you can see anything of theirs.
              </p>

              <div className="onb-fields text-left">
                <GuardianLinks role="PARENT" />
              </div>

              <p className="onb-micro" style={{ marginTop: 16 }}>
                You can also do this later from Settings.
              </p>

              <div className="onb-actions">
                <button type="button" className="btn-primary" onClick={enterDashboard}>
                  Enter MENTA
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
