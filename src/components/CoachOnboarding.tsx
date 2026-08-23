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
import { TeamActions } from "@/components/TeamActions";
import { SchoolCombobox } from "@/components/SchoolCombobox";
import { OnboardingBuildingStep } from "@/components/OnboardingBuildingStep";
import { SPORTS } from "@/lib/sports";
import { GOAL_OPTIONS, GOAL_QUESTION, GOALS_MAX } from "@/lib/goals";
import { SCHOOL_TYPES } from "@/lib/schools";

export const COACHING_ROLES = ["Head Coach", "Assistant Coach", "Strength Coach", "Position Coach", "Other"];

/**
 * Coach onboarding — two real steps: coach profile (saved via
 * /api/onboarding/coach), then create-or-join a team, reusing the exact
 * same TeamActions component and /api/team, /api/team/join routes the
 * Team page already uses — not a second team system bolted onto
 * onboarding. Team creation is skippable; a coach can always do it later
 * from Team.
 */
const TRANSITION_MS = 260;
// See BUILD_MIN_MS in OnboardingExperience.tsx — passed as durationMs to
// OnboardingBuildingStep so its closing "ready" beat lands right before
// this timer fires.
const BUILD_MIN_MS = 6800;

export function CoachOnboarding({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.split(" ")[0];

  const [step, setStep] = useState<"info" | "building" | "team">("info");
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phone, setPhone] = useState("");
  const [sport, setSport] = useState("");
  const [coachingRole, setCoachingRole] = useState("");
  const [yearsCoaching, setYearsCoaching] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [country, setCountry] = useState("United States");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamDone, setTeamDone] = useState(false);

  function handleCountryChange(next: string) {
    setCountry(next);
    setState("");
    setCity("");
    setSchoolName("");
  }

  function handleStateChange(next: string) {
    setState(next);
    setCity("");
    setSchoolName("");
  }

  function goToBuilding() {
    setPhase("exit");
    transitionTimer.current = setTimeout(() => {
      setStep("building");
      setPhase("enter");
    }, TRANSITION_MS);
  }

  function goToTeam() {
    setPhase("exit");
    transitionTimer.current = setTimeout(() => {
      setStep("team");
      setPhase("enter");
    }, TRANSITION_MS);
  }

  // The real save already happened by the time we reach "building" (see
  // submitProfile) — this is a paced hold on the cinematic screen, not a
  // wait for the request itself, same trade-off the athlete flow makes.
  useEffect(() => {
    if (step !== "building") return;
    const buildTimer = setTimeout(goToTeam, BUILD_MIN_MS);
    return () => clearTimeout(buildTimer);
  }, [step]);

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
  }, []);

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || undefined,
          sport: sport || undefined,
          coachingRole: coachingRole || undefined,
          yearsCoaching: yearsCoaching ? Number(yearsCoaching) : undefined,
          organizationName: organizationName || undefined,
          schoolName,
          schoolType,
          country: country || undefined,
          state: state || undefined,
          city: city || undefined,
          focusAreas,
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

      <div className="onb-stage" style={{ maxWidth: 560 }}>
        <div key={step} className={`onb-content ${phase === "exit" ? "onb-exit" : "onb-enter"}`}>
          {step === "info" ? (
            <>
              <h1 className="onb-title">Let&rsquo;s set up your team.</h1>
              <p className="onb-subtitle">{`${firstName}, your team has a lot to manage. MENTA brings it together.`}</p>

              <form onSubmit={submitProfile} className="onb-fields space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="coach-country">Country</label>
                    <CountrySelect id="coach-country" value={country} onChange={handleCountryChange} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="coach-state">State / province</label>
                    <StateSelect id="coach-state" country={country} value={state} onChange={handleStateChange} />
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="coach-city">City</label>
                  <CitySelect id="coach-city" country={country} state={state} value={city} onChange={setCity} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="coach-phone">Phone</label>
                    <PhoneInput id="coach-phone" value={phone} onChange={setPhone} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="coach-sport">Sport</label>
                    <Select
                      id="coach-sport"
                      value={sport}
                      onChange={setSport}
                      placeholder="Select a sport"
                      options={SPORTS.map((s) => ({ value: s.name, label: s.name }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="coach-role">Coaching role</label>
                    <Select
                      id="coach-role"
                      value={coachingRole}
                      onChange={setCoachingRole}
                      placeholder="Select a role"
                      options={COACHING_ROLES.map((r) => ({ value: r, label: r }))}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="coach-years">Years coaching</label>
                    <input id="coach-years" type="number" className="field-input" value={yearsCoaching} onChange={(e) => setYearsCoaching(e.target.value)} placeholder="5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="coach-org">Organization</label>
                    <input id="coach-org" className="field-input" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Ridgeview Athletics" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="coach-school-type">School type</label>
                    <Select
                      id="coach-school-type"
                      value={schoolType}
                      onChange={setSchoolType}
                      placeholder="Select a school type"
                      options={SCHOOL_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="coach-school">School / club</label>
                  <SchoolCombobox
                    id="coach-school"
                    country={country}
                    state={state}
                    schoolType={schoolType}
                    value={schoolName}
                    onChange={setSchoolName}
                    placeholder="Start typing your school or club's name…"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="coach-goals">{GOAL_QUESTION.COACH}</label>
                  <MultiSelect
                    id="coach-goals"
                    options={GOAL_OPTIONS.COACH}
                    value={focusAreas}
                    onChange={setFocusAreas}
                    max={GOALS_MAX}
                    placeholder="Select your goals"
                    searchPlaceholder="Search goals…"
                  />
                </div>

                {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

                <div className="onb-actions">
                  <button type="submit" disabled={loading || !schoolName.trim() || !schoolType} className="btn-primary">
                    {loading ? "Saving…" : "Continue"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : step === "building" ? (
            <OnboardingBuildingStep role="COACH" durationMs={BUILD_MIN_MS} />
          ) : (
            <>
              <h1 className="onb-title">Set up your team</h1>
              <p className="onb-subtitle">Create a new team, or join one with an invite code from your program.</p>

              <div className="onb-fields text-left">
                {teamDone ? (
                  <p className="onb-goal-chip">Team set up. You can manage it anytime from Team.</p>
                ) : (
                  <TeamActions onDone={() => setTeamDone(true)} />
                )}
              </div>

              <p className="onb-micro" style={{ marginTop: 16 }}>
                You can also do this later from Team.
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
