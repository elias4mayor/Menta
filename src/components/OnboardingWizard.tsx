"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = ["Sport", "School", "Goals", "Review"] as const;

export function OnboardingWizard({ name }: { name: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sport, setSport] = useState("");
  const [position, setPosition] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [goals, setGoals] = useState<string[]>([]);

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

  async function finish() {
    setError(null);
    setLoading(true);
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
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const canAdvance = step === 0 ? sport.trim().length > 0 : true;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-bg">
      <div className="w-full max-w-lg">
        <div className="mono text-text-3 mb-2">Welcome, {name.split(" ")[0]}</div>
        <h1 className="text-2xl font-semibold mb-6">Set up your MENTA profile</h1>

        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className="h-1 rounded-full mb-2"
                style={{ background: i <= step ? "var(--grad-signal)" : "var(--border)" }}
              />
              <div className="mono text-text-3">{label}</div>
            </div>
          ))}
        </div>

        <div className="card p-8">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="sport">Sport</label>
                <input id="sport" className="field-input" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Football, Track & Field, Basketball…" required />
              </div>
              <div>
                <label className="field-label" htmlFor="position">Position / event</label>
                <input id="position" className="field-input" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Wide Receiver, 400m…" />
              </div>
              <div>
                <label className="field-label" htmlFor="gradYear">Graduation year</label>
                <input id="gradYear" type="number" className="field-input" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="2027" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="field-label" htmlFor="school">School</label>
                <input id="school" className="field-input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Ridgeview High School" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="field-label" htmlFor="city">City</label>
                  <input id="city" className="field-input" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <label className="field-label" htmlFor="state">State</label>
                  <input id="state" className="field-input" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="field-label" htmlFor="goal">Add up to 5 goals</label>
              <div className="flex gap-2">
                <input
                  id="goal"
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
                  <li key={g + i} className="flex items-center justify-between text-sm bg-surface-2 rounded-[var(--r-sm)] px-3 py-2">
                    <span>{g}</span>
                    <button type="button" onClick={() => removeGoal(i)} className="text-text-3 hover:text-text-1">Remove</button>
                  </li>
                ))}
                {goals.length === 0 && <p className="text-text-3 text-sm">No goals added yet — optional.</p>}
              </ul>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <Row label="Sport" value={sport || "—"} />
              <Row label="Position" value={position || "—"} />
              <Row label="Grad year" value={graduationYear || "—"} />
              <Row label="School" value={schoolName || "—"} />
              <Row label="Location" value={[city, state].filter(Boolean).join(", ") || "—"} />
              <Row label="Goals" value={goals.length ? goals.join(", ") : "—"} />
            </div>
          )}

          {error && <p className="text-sm mt-4" style={{ color: "var(--danger)" }}>{error}</p>}

          <div className="flex justify-between mt-8">
            <button
              type="button"
              className="btn-secondary"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              style={{ visibility: step === 0 ? "hidden" : "visible" }}
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn-primary" disabled={!canAdvance} onClick={() => setStep((s) => s + 1)}>
                Continue
              </button>
            ) : (
              <button type="button" className="btn-primary" disabled={loading} onClick={finish}>
                {loading ? "Saving…" : "Finish setup"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--border)] pb-2">
      <span className="text-text-2">{label}</span>
      <span>{value}</span>
    </div>
  );
}
