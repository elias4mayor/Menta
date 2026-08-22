"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Select } from "@/components/Select";
import { SPORTS } from "@/lib/sports";

const COACHING_ROLES = ["Head Coach", "Assistant Coach", "Strength Coach", "Position Coach", "Other"];
const FOCUS_AREAS = [
  "Team management",
  "Training",
  "Player development",
  "Film",
  "Performance",
  "Recovery",
  "Academics",
  "Recruiting",
  "Safety",
  "Communication",
  "Mental performance",
];

/**
 * Coach onboarding — Phase 1 scope: a single real screen that saves a
 * genuine CoachProfile via /api/onboarding/coach, not the full multi-step
 * cinematic wizard the eventual coach experience calls for (team/org
 * creation happens from the Team page today, reusing the existing Team/
 * Organization/TeamMembership models rather than a second team system
 * bolted onto onboarding).
 */
export function CoachOnboarding({ name }: { name: string }) {
  const router = useRouter();
  const firstName = name.split(" ")[0];

  const [phone, setPhone] = useState("");
  const [sport, setSport] = useState("");
  const [coachingRole, setCoachingRole] = useState("");
  const [yearsCoaching, setYearsCoaching] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleFocus(area: string) {
    setFocusAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));
  }

  async function submit(e: React.FormEvent) {
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
          schoolName: schoolName || undefined,
          focusAreas,
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

  return (
    <div className="onb-root">
      <div className="onb-ambient" aria-hidden="true" />
      <Image src="/logo.png" alt="MENTA" width={863} height={194} className="onb-logo" priority />

      <div className="onb-stage" style={{ maxWidth: 560 }}>
        <div className="onb-content onb-enter">
          <h1 className="onb-title">Welcome to MENTA, Coach.</h1>
          <p className="onb-subtitle">{`${firstName}, your team has a lot to manage. MENTA brings it together.`}</p>

          <form onSubmit={submit} className="onb-fields space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="coach-phone">Phone</label>
                <input id="coach-phone" className="field-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
              </div>
              <div>
                <label className="field-label" htmlFor="coach-years">Years coaching</label>
                <input id="coach-years" type="number" className="field-input" value={yearsCoaching} onChange={(e) => setYearsCoaching(e.target.value)} placeholder="5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="field-label" htmlFor="coach-org">Organization</label>
                <input id="coach-org" className="field-input" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Ridgeview Athletics" />
              </div>
              <div>
                <label className="field-label" htmlFor="coach-school">School / club</label>
                <input id="coach-school" className="field-input" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Ridgeview High School" />
              </div>
            </div>

            <div>
              <div className="field-label">What do you want MENTA to help with?</div>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocus(area)}
                    className="badge"
                    style={{ cursor: "pointer", opacity: focusAreas.includes(area) ? 1 : 0.5 }}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

            <div className="onb-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Setting up…" : "Enter MENTA"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
