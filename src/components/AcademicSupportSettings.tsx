"use client";
import { useEffect, useState } from "react";
type Settings = { enabled: boolean; threshold: number; supporterIds: string[]; candidates: { id: string; name: string; role: string }[] };
export function AcademicSupportSettings() {
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>(); const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);
  async function load() {
    try {
      const response = await fetch("/api/academics/support");
      if (!response.ok) throw new Error("Could not load academic alert settings.");
      const data: Settings = await response.json();
      setError(undefined);
      setSettings({ ...data, supporterIds: data.supporterIds.filter((id) => data.candidates.some((candidate) => candidate.id === id)) });
    } catch { setError("Could not load academic alert settings."); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/academics/support", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Could not load settings."); return response.json() as Promise<Settings>; })
      .then((data) => { setSettings({ ...data, supporterIds: data.supporterIds.filter((id) => data.candidates.some((candidate) => candidate.id === id)) }); })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load academic alert settings."); });
    return () => controller.abort();
  }, []);
  return <section className="space-y-4 border-t border-[var(--border-soft)] pt-8">
    <h2 className="text-xl font-semibold">Academic support alerts</h2>
    <p className="text-sm text-text-2">Receive an in-app notification when a synced, returned Classroom grade or self-reported GPA is below your chosen percentage of its scale, or falls by at least five percentage points. Alerts run when grades are synced or saved. This is a support reminder, not an eligibility decision.</p>
    {!settings && !error && <p>Loading settings…</p>}
    {settings && <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setSaved(false); setError(undefined);
      try {
        const response = await fetch("/api/academics/support", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: settings.enabled, threshold: settings.threshold, supporterIds: settings.supporterIds }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error ?? "Could not save alert settings."); return; }
        setSaved(true);
      } catch { setError("Connection lost. Your choices are still here."); } finally { setBusy(false); }
    }}>
      <label className="flex gap-3"><input type="checkbox" checked={settings.enabled} onChange={(e) => { setSettings({ ...settings, enabled: e.target.checked }); setSaved(false); }} />Enable my academic support alerts</label>
      <div><label className="field-label" htmlFor="academic-alert-threshold">Notify below this percentage of the grade scale</label><select id="academic-alert-threshold" className="field-select" value={settings.threshold} onChange={(e) => { setSettings({ ...settings, threshold: Number(e.target.value) }); setSaved(false); }}>{[90, 80, 75, 70, 65, 60, 50].map((value) => <option key={value} value={value}>{value}%</option>)}</select></div>
      <fieldset className="space-y-3"><legend className="field-label">Who may receive a support reminder? (optional)</legend>
        <p className="text-sm text-text-2">Only your selected current team coach, administrator, teacher, or approved guardian receives a general check-in request. Grades, classes, coursework, and notes stay private. Uncheck anyone and save to stop future reminders to them.</p>
        {!settings.candidates.length && <p className="text-sm text-text-2">Your approved school/team contacts and linked guardians will appear here.</p>}
        {settings.candidates.map((person) => <label key={person.id} className="flex gap-3 py-2"><input type="checkbox" checked={settings.supporterIds.includes(person.id)} onChange={(e) => { setSettings({ ...settings, supporterIds: e.target.checked ? [...settings.supporterIds, person.id] : settings.supporterIds.filter((id) => id !== person.id) }); setSaved(false); }} />{person.name} · {person.role.toLowerCase().replaceAll("_", " ")}</label>)}
      </fieldset>
      <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save alert preferences"}</button>{saved && <p role="status">Alert preferences saved.</p>}
    </form>}
    {error && <div role="alert"><p>{error}</p>{!settings && <button type="button" className="btn-secondary" onClick={() => void load()}>Try again</button>}</div>}
  </section>;
}
