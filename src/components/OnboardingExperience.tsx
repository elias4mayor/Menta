"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Select } from "@/components/Select";
import { GlowWaveText } from "@/components/GlowWaveText";
import { SPORTS, rolesForSport, roleLabel } from "@/lib/sports";
import { pickMotivationalMessages } from "@/lib/motivational-messages";

type Step = "welcome" | "hello" | "sport" | "school" | "goals" | "review" | "building" | "reveal";

const QUESTION_STEPS: Step[] = ["sport", "school", "goals", "review"];

const STATUS_LINES = ["SAVING YOUR PROFILE", "SETTING YOUR GOALS", "PREPARING YOUR DASHBOARD", "READY"];

const TRANSITION_MS = 260;
const BUILD_MIN_MS = 3400;
const STATUS_INTERVAL_MS = 1500;
const MOTIVATION_INTERVAL_MS = 3200;

/**
 * The full first-launch onboarding experience: one dark, continuous
 * environment (logo + ambient glow never unmount) with one question at a
 * time, fading through to a real save and a reveal screen — replacing the
 * previous boxed multi-step form. Every value shown at the end (name,
 * sport, goals) is the athlete's own real answer; nothing here is invented
 * or implies computation (like a generated training plan) that doesn't
 * actually happen.
 */
export function OnboardingExperience({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.split(" ")[0];

  const [step, setStep] = useState<Step>("welcome");
  const [phase, setPhase] = useState<"enter" | "exit">("enter");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  function addGoal() {
    const trimmed = goalInput.trim();
    if (trimmed && goals.length < 5) {
      setGoals([...goals, trimmed]);
      setGoalInput("");
    }
  }

  function removeGoal(index: number) {
    setGoals(goals.filter((_, i) => i !== index));
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

      <Image src="/logo.png" alt="MENTA" width={863} height={194} className="onb-logo" priority />

      <div className="onb-stage">
        <div key={step} className={`onb-content ${phase === "exit" ? "onb-exit" : "onb-enter"}`}>
          {step === "welcome" && (
            <>
              <div className="onb-eyebrow">Athlete Operating System</div>
              <h1 className="onb-title">
                <GlowWaveText intensity="strong" speedMs={4200}>
                  Welcome to MENTA.
                </GlowWaveText>
              </h1>
              <p className="onb-subtitle">Let&rsquo;s build the athlete you want to become.</p>
              <div className="onb-actions">
                <button type="button" className="btn-primary" onClick={() => goTo("hello")}>
                  Let&rsquo;s begin
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {step === "hello" && <HelloStep firstName={firstName} onDone={() => goTo("sport")} />}

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
              <StepNav onBack={() => goTo("hello")} onNext={() => goTo("school")} nextDisabled={!canAdvanceSport} />
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
                  <input
                    id="onb-school"
                    className="field-input"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ridgeview High School"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="onb-city">City</label>
                    <input id="onb-city" className="field-input" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="onb-state">State</label>
                    <input id="onb-state" className="field-input" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                </div>
              </div>
              <StepNav onBack={() => goTo("sport")} onNext={() => goTo("goals")} />
            </>
          )}

          {step === "goals" && (
            <>
              <h1 className="onb-title">
                <GlowWaveText intensity="strong">What do you want to improve?</GlowWaveText>
              </h1>
              <p className="onb-micro">We&rsquo;ll build around what matters most. Up to five.</p>
              <div className="onb-fields space-y-3">
                <div className="flex gap-2">
                  <input
                    className="field-input"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="Get recruited to a D1 program"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addGoal();
                      }
                    }}
                  />
                  <button type="button" onClick={addGoal} className="btn-secondary shrink-0">Add</button>
                </div>
                <ul className="space-y-2">
                  {goals.map((g, i) => (
                    <li key={g + i} className="onb-goal-chip">
                      <span>{g}</span>
                      <button type="button" onClick={() => removeGoal(i)} className="text-text-3 hover:text-text-1">
                        Remove
                      </button>
                    </li>
                  ))}
                  {goals.length === 0 && <p className="text-text-3 text-sm">No goals added yet — optional.</p>}
                </ul>
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
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="onb-nav">
      <button type="button" className="btn-secondary" onClick={onBack}>
        Back
      </button>
      <button type="button" className="btn-primary" disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm" style={{ borderBottom: "1px solid var(--border-soft)", paddingBottom: 8 }}>
      <span className="text-text-3">{label}</span>
      <span className="text-text-1">{value}</span>
    </div>
  );
}

function HelloStep({ firstName, onDone }: { firstName: string; onDone: () => void }) {
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    const timer = setTimeout(() => doneRef.current(), 2600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <h1 className="onb-title">
        <GlowWaveText intensity="strong" speedMs={4200}>{`Hello, ${firstName}.`}</GlowWaveText>
      </h1>
      <p className="onb-subtitle">We&rsquo;re going to build your MENTA around you.</p>
      <div className="onb-actions">
        <button type="button" className="text-sm text-text-2 hover:text-text-1 transition-colors" onClick={onDone}>
          Continue
        </button>
      </div>
    </>
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
