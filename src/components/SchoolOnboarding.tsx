"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SchoolCombobox } from "@/components/SchoolCombobox";
import { Select } from "@/components/Select";

const setup = {
  TEACHER: { title: "Let's set up your classroom connection.", detail: "Introduce your school and subject. Student records stay private until an authorized sharing workflow is in place.", options: ["English", "Mathematics", "Science", "Social studies", "Languages", "Physical education", "Arts", "Counseling", "Other"] },
  STUDENT: { title: "Your school day, together.", detail: "Keep classes, assignments, messages, and your team in reach. You can connect Google Classroom from Academics after setup.", options: ["Middle school", "High school", "College", "Other"] },
  STAFF: { title: "Let's set up your team support role.", detail: "Choose your school and focus. Your team owner appoints staff access separately; choosing a role here doesn't grant it.", options: ["Team operations", "Transportation", "Equipment", "Athletic department", "Academic support", "Other"] },
};
export function SchoolOnboarding({ role, initial }: { role: keyof typeof setup; initial?: { schoolName: string; focus: string | null } }) {
  const router = useRouter();
  const [schoolName, setSchool] = useState(initial?.schoolName ?? "");
  const [focus, setFocus] = useState(initial?.focus ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const copy = setup[role];
  return <form className="max-w-lg mx-auto space-y-6 py-12" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError(undefined);
    try {
      const response = await fetch("/api/onboarding/school", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ schoolName, focus }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not save your setup."); return; }
      router.push("/dashboard");
    } catch { setError("Connection lost. Your choices are still here—try again."); }
    finally { setBusy(false); }
  }}>
    <h1 className="text-3xl font-semibold">{copy.title}</h1><p className="text-text-2">{copy.detail}</p>
    <div><label className="field-label" htmlFor="school-setup-name">School</label><SchoolCombobox id="school-setup-name" value={schoolName} onChange={setSchool} /></div>
    <div><label className="field-label" htmlFor="school-setup-focus">Your focus</label><Select id="school-setup-focus" value={focus} onChange={setFocus} options={copy.options.map((label) => ({ label, value: label }))} placeholder="Choose a focus" /></div>
    {error && <p role="alert">{error}</p>}
    <button className="btn-primary" type="submit" disabled={busy || !schoolName.trim()}>{busy ? "Saving…" : initial ? "Save profile" : "Continue to MENTA"}</button>
  </form>;
}
