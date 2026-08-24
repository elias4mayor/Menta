"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Select } from "@/components/Select";
import { MultiSelect } from "@/components/MultiSelect";
import { SchoolCombobox } from "@/components/SchoolCombobox";
import { CountrySelect } from "@/components/CountrySelect";
import { StateField } from "@/components/StateField";
import { CitySelect } from "@/components/CitySelect";
import { GlowWaveText } from "@/components/GlowWaveText";
import { OnboardingBuildingStep } from "@/components/OnboardingBuildingStep";
import { SPORTS, rolesForSport, roleLabel, demandsFor } from "@/lib/sports";
import { GOAL_OPTIONS, GOAL_QUESTION, GOALS_MAX } from "@/lib/goals";
import { SCHOOL_TYPES } from "@/lib/schools";

type Step = "sport" | "school" | "goals" | "review" | "building" | "reveal";

const QUESTION_STEPS: Step[] = ["sport", "school", "goals", "review"];

const TRANSITION_MS = 260;
// Must match OnboardingBuildingStep's own internal pacing (5 status lines
// at 1300ms + a closing "ready" hold) closely enough that its final beat
// lands right before this timer fires and hands off to "reveal" — see
// durationMs on that component.
const BUILD_MIN_MS = 7000;

/**
 * The full first-launch onboarding experience: one dark, continuous
 * environment (logo + ambient glow never unmount) with one question at a
 * time, fading through to a real save and a reveal screen — replacing the
 * previous boxed multi-step form. Every value shown at the end (name,
 * sport, goals) is the athlete's own real answer; nothing here is invented
 * or implies computation (like a generated training plan) that doesn't
 * actually happen. Reached only from behind OnboardingGate/MentaIntro,
 * whose own logo reveal + "Welcome to MENTA." + "Hello" beats already
 * cover what this component's old boot/welcome/hello preamble used to —
 * this starts straight at the first real question.
 */
export function OnboardingExperience({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.split(" ")[0];

  const [step, setStep] = useState<Step>("sport");
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // sportsList[0] is shown as the main "Sport" field; anything appended via
  // "+ Add another sport" lives at index 1+. Which one is actually primary
  // is a separate, explicit choice (primarySport) once there's more than
  // one — never assumed to be index 0 just because it was entered first.
  const [sportsList, setSportsList] = useState<{ sport: string; position: string }[]>([
    { sport: "", position: "" },
  ]);
  const [primarySport, setPrimarySport] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("United States");
  const [goals, setGoals] = useState<string[]>([]);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);

  // Country determines which states/provinces (and cities) are even
  // valid, so switching it invalidates whatever was already picked —
  // including a school name, since school search is scoped to the
  // selected country/state and a school chosen under the old one may no
  // longer be geographically consistent (School Type isn't cleared: it's
  // a real category independent of location).
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

  const filledSports = sportsList.filter((s) => s.sport.trim().length > 0);
  const hasDuplicateSports = new Set(filledSports.map((s) => s.sport)).size !== filledSports.length;
  const primaryEntry =
    filledSports.length > 1
      ? filledSports.find((s) => s.sport === primarySport) ?? filledSports[0]
      : filledSports[0];
  const canAdvanceSport = filledSports.length > 0 && !hasDuplicateSports;

  function updateSportEntry(index: number, patch: Partial<{ sport: string; position: string }>) {
    setSportsList((prev) => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }

  function addSportSlot() {
    setSportsList((prev) => [...prev, { sport: "", position: "" }]);
  }

  function removeSportSlot(index: number) {
    setSportsList((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
  }, []);

  function goTo(next: Step) {
    setPhase("exit");
    transitionTimer.current = setTimeout(() => {
      setStep(next);
      setPhase("enter");
    }, TRANSITION_MS);
  }

  // Runs the real save exactly once when entering "building" — the status
  // lines and motivational messages play alongside actual work, clamped to
  // a minimum visible duration so it never feels instantaneous, not as a
  // substitute for the work.
  useEffect(() => {
    if (step !== "building") return;
    let cancelled = false;
    const start = Date.now();

    (async () => {
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sport: primaryEntry.sport,
            position: primaryEntry.position || undefined,
            additionalSports: filledSports
              .filter((s) => s.sport !== primaryEntry.sport)
              .map((s) => ({ sport: s.sport, position: s.position || undefined })),
            graduationYear: graduationYear ? Number(graduationYear) : undefined,
            schoolName,
            schoolType,
            city: city || undefined,
            state: state || undefined,
            country: country || undefined,
            trainingDaysPerWeek: trainingDaysPerWeek ? Number(trainingDaysPerWeek) : undefined,
            goals,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(data.error ?? "Something went wrong.");
            goTo("review");
          }
          return;
        }
        const elapsed = Date.now() - start;
        if (elapsed < BUILD_MIN_MS) await new Promise((r) => setTimeout(r, BUILD_MIN_MS - elapsed));
        if (!cancelled) goTo("reveal");
      } catch {
        if (!cancelled) {
          setError("Network error. Try again.");
          goTo("review");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // router.refresh() here used to race router.push("/dashboard") — both are
  // App Router transitions, and firing refresh() right after push()
  // interrupted the in-flight navigation with a refetch of the *current*
  // route instead. push() alone already fetches fresh server data for the
  // destination route, so the extra refresh() was redundant on top of being
  // the race. (The other half of the original bug was upstream, in
  // VerifyEmailForm — see its comment.)
  function enterDashboard() {
    if (entering) return;
    setEntering(true);
    router.push("/dashboard");
  }

  const questionIndex = QUESTION_STEPS.indexOf(step);
  const showProgress = questionIndex >= 0;

  return (
    <div className="onb-root">
      <div className="onb-ambient" aria-hidden="true" />

      <Image src="/logo.png" alt="MENTA" width={863} height={194} className="onb-logo onb-logo-settled" priority />

      {showProgress && (
        <>
          <div className="onb-progress-track" aria-hidden="true">
            <div
              className="onb-progress-fill"
              style={{ width: `${((questionIndex + 1) / QUESTION_STEPS.length) * 100}%` }}
            />
          </div>
          <div className="onb-progress-count">
            {String(questionIndex + 1).padStart(2, "0")} / {String(QUESTION_STEPS.length).padStart(2, "0")}
          </div>
        </>
      )}

      <div className="onb-stage">
        <div key={step} className={`onb-content ${phase === "exit" ? "onb-exit" : "onb-enter"}`}>
          {step === "sport" && (
            <>
              <h1 className="onb-title">
                <GlowWaveText intensity="strong">What sport do you compete in?</GlowWaveText>
              </h1>
              <p className="onb-micro">This is where your MENTA starts.</p>
              <div className="onb-fields space-y-4">
                {sportsList.map((entry, index) => (
                  <div
                    key={index}
                    className="space-y-4"
                    style={index > 0 ? { marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border-soft)" } : undefined}
                  >
                    {index > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-text-3 text-sm">Another sport</span>
                        <button
                          type="button"
                          className="text-xs text-text-3 hover:text-text-2"
                          onClick={() => removeSportSlot(index)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div>
                      <label className="field-label" htmlFor={`onb-sport-${index}`}>Sport</label>
                      <Select
                        id={`onb-sport-${index}`}
                        value={entry.sport}
                        onChange={(v) =>
                          updateSportEntry(index, {
                            sport: v,
                            position: rolesForSport(v).includes(entry.position) ? entry.position : "",
                          })
                        }
                        placeholder="Select a sport"
                        options={SPORTS.map((s) => ({ value: s.name, label: s.name }))}
                      />
                      {entry.sport && sportsList.some((s, i) => i < index && s.sport === entry.sport) && (
                        <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>
                          You already added {entry.sport}.
                        </p>
                      )}
                    </div>
                    {entry.sport && (
                      <div>
                        <label className="field-label" htmlFor={`onb-position-${index}`}>{roleLabel(entry.sport)}</label>
                        {rolesForSport(entry.sport).length > 0 ? (
                          <Select
                            id={`onb-position-${index}`}
                            value={entry.position}
                            onChange={(v) => updateSportEntry(index, { position: v })}
                            placeholder={`Select a ${roleLabel(entry.sport).toLowerCase()}`}
                            options={rolesForSport(entry.sport).map((p) => ({ value: p, label: p }))}
                          />
                        ) : (
                          <input
                            id={`onb-position-${index}`}
                            className="field-input"
                            value={entry.position}
                            onChange={(e) => updateSportEntry(index, { position: e.target.value })}
                            placeholder={`Your ${roleLabel(entry.sport).toLowerCase()}`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  className="text-sm text-text-2 hover:text-text-1"
                  disabled={!sportsList[sportsList.length - 1]?.sport}
                  onClick={addSportSlot}
                >
                  + Add another sport
                </button>

                {filledSports.length > 1 && (
                  <div>
                    <label className="field-label" htmlFor="onb-primary-sport">Which is your primary sport?</label>
                    <Select
                      id="onb-primary-sport"
                      value={primaryEntry?.sport ?? ""}
                      onChange={setPrimarySport}
                      placeholder="Choose your primary sport"
                      options={filledSports.map((s) => ({
                        value: s.sport,
                        label: s.position ? `${s.sport} · ${s.position}` : s.sport,
                      }))}
                    />
                  </div>
                )}

                <div>
                  <label className="field-label" htmlFor="onb-gradyear">Graduation year</label>
                  <input
                    id="onb-gradyear"
                    type="number"
                    className="field-input"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    placeholder="2027"
                  />
                </div>
              </div>
              <StepNav onNext={() => goTo("school")} nextDisabled={!canAdvanceSport} />
            </>
          )}

          {step === "school" && (
            <>
              <h1 className="onb-title">
                <GlowWaveText intensity="strong">Where do you train?</GlowWaveText>
              </h1>
              <p className="onb-micro">MENTA adapts to your program and your team.</p>
              <div className="onb-fields space-y-4">
                <div>
                  <label className="field-label" htmlFor="onb-school-type">School type</label>
                  <Select
                    id="onb-school-type"
                    value={schoolType}
                    onChange={setSchoolType}
                    placeholder="Select a school type"
                    options={SCHOOL_TYPES.map((t) => ({ value: t, label: t }))}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="onb-school">School</label>
                  <SchoolCombobox
                    id="onb-school"
                    country={country}
                    state={state}
                    schoolType={schoolType}
                    value={schoolName}
                    onChange={setSchoolName}
                    placeholder="Start typing your school's name…"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="onb-country">Country</label>
                  <CountrySelect id="onb-country" value={country} onChange={handleCountryChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="onb-state">State</label>
                    <StateField id="onb-state" country={country} value={state} onChange={handleStateChange} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="onb-city">City</label>
                    <CitySelect id="onb-city" country={country} state={state} value={city} onChange={setCity} />
                  </div>
                </div>
              </div>
              <StepNav
                onBack={() => goTo("sport")}
                onNext={() => goTo("goals")}
                nextDisabled={!schoolName.trim() || !schoolType}
              />
            </>
          )}

          {step === "goals" && (
            <>
              <h1 className="onb-title">
                <GlowWaveText intensity="strong">{GOAL_QUESTION.ATHLETE}</GlowWaveText>
              </h1>
              <p className="onb-micro">Select everything you want MENTA to help you improve.</p>
              <div className="onb-fields space-y-4">
                <div>
                  <label className="field-label" htmlFor="onb-goals">Goals</label>
                  <MultiSelect
                    id="onb-goals"
                    options={GOAL_OPTIONS.ATHLETE}
                    value={goals}
                    onChange={setGoals}
                    max={GOALS_MAX}
                    placeholder="Select your goals"
                    searchPlaceholder="Search goals…"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="onb-training-days">Training days per week</label>
                  <Select
                    id="onb-training-days"
                    value={trainingDaysPerWeek}
                    onChange={setTrainingDaysPerWeek}
                    placeholder="How many days can you train?"
                    options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} day${n > 1 ? "s" : ""}/week` }))}
                  />
                </div>
              </div>
              <StepNav onBack={() => goTo("school")} onNext={() => goTo("review")} />
            </>
          )}

          {step === "review" && (
            <>
              <h1 className="onb-title">
                <GlowWaveText intensity="strong">Ready to build your MENTA?</GlowWaveText>
              </h1>
              <p className="onb-micro">Here&rsquo;s what we&rsquo;ve got — you can go back and change anything.</p>
              <div className="onb-fields space-y-2">
                <ReviewRow
                  label={filledSports.length > 1 ? "Sports" : "Sport"}
                  value={
                    filledSports.length
                      ? filledSports.map((s) => (s.position ? `${s.sport} (${s.position})` : s.sport)).join(", ")
                      : "—"
                  }
                />
                {filledSports.length > 1 && <ReviewRow label="Primary sport" value={primaryEntry?.sport ?? "—"} />}
                <ReviewRow label="School" value={schoolName || "—"} />
                <ReviewRow label="School type" value={schoolType || "—"} />
                <ReviewRow label="Location" value={[city, state].filter(Boolean).join(", ") || "—"} />
                <ReviewRow label="Goals" value={goals.length ? goals.join(", ") : "—"} />
                <ReviewRow label="Training days" value={trainingDaysPerWeek ? `${trainingDaysPerWeek}/week` : "—"} />
              </div>
              {error && <p className="text-sm mt-4" style={{ color: "var(--danger)" }}>{error}</p>}
              <StepNav onBack={() => goTo("goals")} onNext={() => goTo("building")} nextLabel="Build my MENTA" />
            </>
          )}

          {step === "building" && <OnboardingBuildingStep role="ATHLETE" durationMs={BUILD_MIN_MS} />}

          {step === "reveal" && (
            <>
              <h1 className="onb-title">
                <GlowWaveText intensity="strong">Your MENTA is ready.</GlowWaveText>
              </h1>
              <div className="onb-reveal-row"><b>{firstName}</b></div>
              <div className="onb-reveal-row">
                {primaryEntry.sport}{primaryEntry.position ? ` · ${primaryEntry.position}` : ""}
              </div>
              {filledSports.length > 1 && (
                <p className="onb-micro" style={{ marginTop: 4 }}>
                  + {filledSports.length - 1} more sport{filledSports.length - 1 > 1 ? "s" : ""} added
                </p>
              )}
              {goals.length > 0 && (
                <div className="onb-reveal-row" style={{ marginTop: 12 }}>
                  {goals.join(" · ")}
                </div>
              )}
              {primaryEntry.sport && (
                <div className="onb-reveal-row" style={{ marginTop: 12 }}>
                  Priority: {demandsFor(primaryEntry.sport, primaryEntry.position || undefined).developmentAreas.join(" · ")}
                </div>
              )}
              <p className="onb-micro" style={{ marginTop: 16 }}>
                A starter training plan for {primaryEntry.sport} is ready in your Training library.
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

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
}: {
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="onb-nav">
      {onBack && (
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
      )}
      <button type="button" className="btn-primary" disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-base" style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: 10 }}>
      <span className="text-text-3">{label}</span>
      <span className="text-text-1 font-semibold">{value}</span>
    </div>
  );
}

