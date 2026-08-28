"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";
import { CountrySelect } from "@/components/CountrySelect";
import { StateSelect } from "@/components/StateSelect";
import { CitySelect } from "@/components/CitySelect";
import { PhoneInput } from "@/components/PhoneInput";
import { TeamActions } from "@/components/TeamActions";
import { OnboardingBuildingStep } from "@/components/OnboardingBuildingStep";
import { PROVIDER_TITLES, DOCTOR_SPECIALTIES } from "@/lib/care";

/**
 * Doctor (MENTA Care provider) onboarding — same shape as
 * TrainerOnboarding: profile step, then create-or-join a team via the
 * existing invite-code system (TeamMembership.teamRole already includes
 * "DOCTOR"). No goals step — this role's goals aren't the fitness-goal
 * kind GOAL_OPTIONS models for the other four roles. Joining a team here
 * makes this account a *pending* provider on it — a coach/admin of that
 * team must verify them (see Team page) before MENTA Care lists them to
 * any athlete.
 */
const TRANSITION_MS = 260;
const BUILD_MIN_MS = 6800;

export function DoctorOnboarding({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.split(" ")[0];

  const [step, setStep] = useState<"info" | "building" | "team">("info");
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [credentials, setCredentials] = useState("");
  const [country, setCountry] = useState("United States");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [teamDone, setTeamDone] = useState(false);

  function handleCountryChange(next: string) {
    setCountry(next);
    setState("");
    setCity("");
  }

  function handleStateChange(next: string) {
    setState(next);
    setCity("");
  }

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
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
      const res = await fetch("/api/onboarding/doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || undefined,
          title,
          specialties,
          credentials: credentials || undefined,
          country: country || undefined,
          state: state || undefined,
          city: city || undefined,
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
    if (entering) return;
    setEntering(true);
    router.push("/dashboard");
  }

  return (
    <div className="onb-root">
      <div className="onb-ambient" aria-hidden="true" />
      <Image src="/logo.png" alt="MENTA" width={863} height={194} className="onb-logo onb-logo-settled" priority />

      <div className="onb-stage" style={{ maxWidth: 560 }}>
        <div key={step} className={`onb-content ${phase === "exit" ? "onb-exit" : "onb-enter"}`}>
          {step === "info" ? (
            <>
              <h1 className="onb-title">Let&rsquo;s set up your provider profile.</h1>
              <p className="onb-subtitle">{`${firstName}, join a team to start receiving care requests from athletes.`}</p>

              <form onSubmit={submitProfile} className="onb-fields space-y-4">
                <div>
                  <label className="field-label" htmlFor="doctor-title">Title</label>
                  <Select
                    id="doctor-title"
                    value={title}
                    onChange={setTitle}
                    placeholder="Select your title"
                    options={PROVIDER_TITLES.map((t) => ({ value: t, label: t }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="doctor-country">Country</label>
                    <CountrySelect id="doctor-country" value={country} onChange={handleCountryChange} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="doctor-state">State / province</label>
                    <StateSelect id="doctor-state" country={country} value={state} onChange={handleStateChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="doctor-city">City</label>
                    <CitySelect id="doctor-city" country={country} state={state} value={city} onChange={setCity} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="doctor-phone">Phone</label>
                    <PhoneInput id="doctor-phone" value={phone} onChange={setPhone} />
                  </div>
                </div>

                <div>
                  <div className="field-label">Specialties</div>
                  <div className="flex flex-wrap gap-2">
                    {DOCTOR_SPECIALTIES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSpecialty(s)}
                        className="badge"
                        style={{ cursor: "pointer", opacity: specialties.includes(s) ? 1 : 0.5 }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="doctor-credentials">Credentials</label>
                  <input
                    id="doctor-credentials"
                    className="field-input"
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    placeholder="License, board certification, etc. (optional)"
                  />
                </div>

                {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

                <div className="onb-actions">
                  <button type="submit" disabled={loading || !title} className="btn-primary">
                    {loading ? "Saving…" : "Continue"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </form>
            </>
          ) : step === "building" ? (
            <OnboardingBuildingStep role="DOCTOR" durationMs={BUILD_MIN_MS} />
          ) : (
            <>
              <h1 className="onb-title">Connect with your team</h1>
              <p className="onb-subtitle">
                Join a team with an invite code. A coach there will need to verify you before athletes can book care with you.
              </p>

              <div className="onb-fields text-left">
                {teamDone ? (
                  <p className="onb-goal-chip">Joined. A coach on your team needs to verify you before you appear as bookable.</p>
                ) : (
                  <TeamActions onDone={() => setTeamDone(true)} />
                )}
              </div>

              <p className="onb-micro" style={{ marginTop: 16 }}>
                You can also do this later from Team.
              </p>

              <div className="onb-actions">
                <button type="button" className="btn-primary" onClick={enterDashboard} disabled={entering}>
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
