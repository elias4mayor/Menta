"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Select } from "@/components/Select";
import { MultiSelect } from "@/components/MultiSelect";
import { SchoolCombobox } from "@/components/SchoolCombobox";
import { CountrySelect } from "@/components/CountrySelect";
import { StateField } from "@/components/StateField";
import { GlowWaveText } from "@/components/GlowWaveText";
import { SPORTS, rolesForSport, roleLabel, demandsFor } from "@/lib/sports";
import { GOAL_OPTIONS, GOAL_QUESTION, GOALS_MAX } from "@/lib/goals";
import { pickMotivationalMessages } from "@/lib/motivational-messages";

type Step = "sport" | "school" | "goals" | "review" | "building" | "reveal";

const QUESTION_STEPS: Step[] = ["sport", "school", "goals", "review"];

const STATUS_LINES = ["SAVING YOUR PROFILE", "SETTING YOUR GOALS", "PREPARING YOUR DASHBOARD", "READY"];

const TRANSITION_MS = 260;
const BUILD_MIN_MS = 3400;
// Matches the @keyframes onbStatusCycle / onbMotivationCycle durations in
// globals.css — kept in sync so each line's fade-out lines up with the
// next one's arrival instead of overlapping or leaving a gap.
const STATUS_INTERVAL_MS = 2200;
const MOTIVATION_INTERVAL_MS = 4400;

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

  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("United States");
  const [goals, setGoals] = useState<string[]>([]);
  const [trainingDaysPerWeek, setTrainingDaysPerWeek] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Country determines which states/provinces (and eventually cities) are
  // even valid, so switching it invalidates whatever was already picked.
  function handleCountryChange(next: string) {
    setCountry(next);
    setState("");
    setCity("");
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
            sport,
            position: position || undefined,
            graduationYear: graduationYear ? Number(graduationYear) : undefined,
            schoolName: schoolName || undefined,
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

  function enterDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  const questionIndex = QUESTION_STEPS.indexOf(step);
  const showProgress = questionIndex >= 0;
  const canAdvanceSport = sport.trim().length > 0;

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
                <GlowWaveText intensity="strong">What sport do you play?</GlowWaveText>
              </h1>
              <p className="onb-micro">This is where your MENTA starts.</p>
              <div className="onb-fields space-y-4">
                <div>
                  <label className="field-label" htmlFor="onb-sport">Sport</label>
                  <Select
                    id="onb-sport"
                    value={sport}
                    onChange={(v) => {
                      setSport(v);
                      if (!rolesForSport(v).includes(position)) setPosition("");
                    }}
                    placeholder="Select a sport"
                    options={SPORTS.map((s) => ({ value: s.name, label: s.name }))}
                  />
                </div>
                {sport && (
                  <div>
                    <label className="field-label" htmlFor="onb-position">{roleLabel(sport)}</label>
                    {rolesForSport(sport).length > 0 ? (
                      <Select
                        id="onb-position"
                        value={position}
                        onChange={setPosition}
                        placeholder={`Select a ${roleLabel(sport).toLowerCase()}`}
                        options={rolesForSport(sport).map((p) => ({ value: p, label: p }))}
                      />
                    ) : (
                      <input
                        id="onb-position"
                        className="field-input"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        placeholder={`Your ${roleLabel(sport).toLowerCase()}`}
                      />
                    )}
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
                  <label className="field-label" htmlFor="onb-school">School</label>
                  <SchoolCombobox
                    id="onb-school"
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
                    <label className="field-label" htmlFor="onb-city">City</label>
                    <input id="onb-city" className="field-input" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="onb-state">State</label>
                    <StateField id="onb-state" country={country} value={state} onChange={setState} />
                  </div>
                </div>
              </div>
              <StepNav onBack={() => goTo("sport")} onNext={() => goTo("goals")} />
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
                <ReviewRow label="Sport" value={sport || "—"} />
                <ReviewRow label={sport ? roleLabel(sport) : "Position"} value={position || "—"} />
                <ReviewRow label="School" value={schoolName || "—"} />
                <ReviewRow label="Location" value={[city, state].filter(Boolean).join(", ") || "—"} />
                <ReviewRow label="Goals" value={goals.length ? goals.join(", ") : "—"} />
                <ReviewRow label="Training days" value={trainingDaysPerWeek ? `${trainingDaysPerWeek}/week` : "—"} />
              </div>
              {error && <p className="text-sm mt-4" style={{ color: "var(--danger)" }}>{error}</p>}
              <StepNav onBack={() => goTo("goals")} onNext={() => goTo("building")} nextLabel="Build my MENTA" />
            </>
          )}

          {step === "building" && <BuildingStep goals={goals} />}

          {step === "reveal" && (
            <>
              <h1 className="onb-title">
                <GlowWaveText intensity="strong">Your MENTA is ready.</GlowWaveText>
              </h1>
              <div className="onb-reveal-row"><b>{firstName}</b></div>
              <div className="onb-reveal-row">{sport}{position ? ` · ${position}` : ""}</div>
              {goals.length > 0 && (
                <div className="onb-reveal-row" style={{ marginTop: 12 }}>
                  {goals.join(" · ")}
                </div>
              )}
              {sport && (
                <div className="onb-reveal-row" style={{ marginTop: 12 }}>
                  Priority: {demandsFor(sport, position || undefined).developmentAreas.join(" · ")}
                </div>
              )}
              <p className="onb-micro" style={{ marginTop: 16 }}>
                A starter training plan for {sport} is ready in your Training library.
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

function BuildingStep({ goals }: { goals: string[] }) {
  const [statusIndex, setStatusIndex] = useState(0);
  const [motivationIndex, setMotivationIndex] = useState(0);
  const messages = useMemo(() => pickMotivationalMessages(goals), [goals]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIndex((i) => Math.min(i + 1, STATUS_LINES.length - 1));
    }, STATUS_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setMotivationIndex((i) => (i + 1) % messages.length);
    }, MOTIVATION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <>
      <h1 className="onb-title">Building your MENTA.</h1>
      <p className="onb-subtitle">We&rsquo;re putting everything together.</p>
      <div className="onb-motivation">
        <div key={motivationIndex} className="onb-motivation-line">
          {messages[motivationIndex]}
        </div>
      </div>
      <div className="onb-status">
        <div key={statusIndex} className="onb-status-line">
          {STATUS_LINES[statusIndex]}
        </div>
      </div>
    </>
  );
}
