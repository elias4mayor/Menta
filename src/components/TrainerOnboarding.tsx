"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";
import { TeamActions } from "@/components/TeamActions";
import { SPORTS } from "@/lib/sports";

export const SPECIALTIES = [
  "Strength",
  "Speed",
  "Agility",
  "Mobility",
  "Conditioning",
  "Recovery",
  "Position-specific training",
  "Mental performance",
  "Nutrition education",
  "Other",
];

/**
 * Trainer onboarding — two real steps: profile (saved via
 * /api/onboarding/trainer), then create-or-join a group. "Clients" reuses
 * the same Team/TeamMembership model coaches use (TeamMembership.teamRole
 * already includes "TRAINER") rather than a separate client-roster system
 * — a trainer's clients are the athletes on a team they're a trainer-role
 * member of. Skippable; can be done later from Team.
 */
export function TrainerOnboarding({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.split(" ")[0];

  const [step, setStep] = useState<"info" | "group">("info");

  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [sport, setSport] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [trainingLocation, setTrainingLocation] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [certifications, setCertifications] = useState("");
  const [trainingPhilosophy, setTrainingPhilosophy] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupDone, setGroupDone] = useState(false);

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/trainer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone || undefined,
          businessName: businessName || undefined,
          sport: sport || undefined,
          specialties,
          trainingLocation: trainingLocation || undefined,
          yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
          certifications: certifications || undefined,
          trainingPhilosophy: trainingPhilosophy || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setStep("group");
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
        <div key={step} className="onb-content onb-enter">
          {step === "info" ? (
            <>
              <h1 className="onb-title">Let&rsquo;s set up your training profile.</h1>
              <p className="onb-subtitle">{`${firstName}, build the programs your athletes actually need.`}</p>

              <form onSubmit={submitProfile} className="onb-fields space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="trainer-phone">Phone</label>
                    <input id="trainer-phone" className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="trainer-business">Business / organization</label>
                    <input id="trainer-business" className="field-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Optional" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="trainer-sport">Primary sport</label>
                    <Select
                      id="trainer-sport"
                      value={sport}
                      onChange={setSport}
                      placeholder="Select a sport"
                      options={SPORTS.map((s) => ({ value: s.name, label: s.name }))}
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="trainer-years">Years experience</label>
                    <input id="trainer-years" type="number" className="field-input" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="5" />
                  </div>
                </div>

                <div>
                  <label className="field-label" htmlFor="trainer-location">Training location</label>
                  <input id="trainer-location" className="field-input" value={trainingLocation} onChange={(e) => setTrainingLocation(e.target.value)} placeholder="Gym, facility, or city" />
                </div>

                <div>
                  <div className="field-label">Specialties</div>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map((s) => (
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
                  <label className="field-label" htmlFor="trainer-certs">Certifications</label>
                  <input id="trainer-certs" className="field-input" value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="CSCS, USAW, etc. (optional)" />
                </div>

                <div>
                  <label className="field-label" htmlFor="trainer-philosophy">Training philosophy</label>
                  <textarea id="trainer-philosophy" className="field-textarea" rows={2} value={trainingPhilosophy} onChange={(e) => setTrainingPhilosophy(e.target.value)} placeholder="Optional — a sentence or two." />
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
          ) : (
            <>
              <h1 className="onb-title">Connect with your athletes</h1>
              <p className="onb-subtitle">Create a group for your clients, or join one with an invite code.</p>

              <div className="onb-fields text-left">
                {groupDone ? (
                  <p className="onb-goal-chip">Group set up. You can manage it anytime from Team.</p>
                ) : (
                  <TeamActions onDone={() => setGroupDone(true)} />
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
