"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AcademicTermItem = {
  id: string;
  term: string;
  year: number | null;
  gpa: number | null;
  gpaScale: number | null;
  classInfo: string | null;
  notes: string | null;
};

const TERMS = ["FALL", "SPRING", "SUMMER", "OTHER"];

export function AcademicTerms({ initial }: { initial: AcademicTermItem[] }) {
  const router = useRouter();
  const [terms, setTerms] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [term, setTerm] = useState("FALL");
  const [year, setYear] = useState("");
  const [gpa, setGpa] = useState("");
  const [gpaScale, setGpaScale] = useState("4");
  const [classInfo, setClassInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/academics/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term,
          year: year ? Number(year) : undefined,
          gpa: gpa ? Number(gpa) : undefined,
          gpaScale: gpaScale ? Number(gpaScale) : undefined,
          classInfo: classInfo || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't save this term.");
        return;
      }
      setTerms((t) => [data.term, ...t]);
      setYear("");
      setGpa("");
      setClassInfo("");
      setNotes("");
      setShowForm(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removeTerm(id: string) {
    setTerms((t) => t.filter((x) => x.id !== id));
    await fetch(`/api/academics/terms/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="mono text-text-3">GPA / term history</div>
        <button onClick={() => setShowForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
          {showForm ? "Cancel" : "+ Add term"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-4 space-y-3 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="field-label" htmlFor="term-select">Term</label>
              <select id="term-select" className="field-select" value={term} onChange={(e) => setTerm(e.target.value)}>
                {TERMS.map((t) => (
                  <option key={t} value={t}>{t[0]}{t.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="term-year">Year</label>
              <input id="term-year" type="number" className="field-input" value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="term-gpa">GPA</label>
              <input id="term-gpa" type="number" step="0.01" min={0} max={10} className="field-input" value={gpa} onChange={(e) => setGpa(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="term-scale">Scale</label>
              <input id="term-scale" type="number" step="0.1" min={1} max={10} className="field-input" value={gpaScale} onChange={(e) => setGpaScale(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="term-classes">Classes (optional)</label>
            <input id="term-classes" className="field-input" placeholder="e.g. AP Calculus, Physics, English 11" value={classInfo} onChange={(e) => setClassInfo(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="term-notes">Notes (optional)</label>
            <textarea id="term-notes" className="field-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save term"}
          </button>
        </form>
      )}

      {terms.length === 0 && !showForm ? (
        <p className="text-text-2 text-sm">No GPA history logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {terms.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 text-sm card p-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{t.term[0]}{t.term.slice(1).toLowerCase()}{t.year ? ` ${t.year}` : ""}</span>
                  {t.gpa != null && <span>GPA {t.gpa}{t.gpaScale ? `/${t.gpaScale}` : ""}</span>}
                  <span className="badge">Entered by athlete</span>
                </div>
                {t.classInfo && <p className="text-text-3 text-xs mt-1">{t.classInfo}</p>}
                {t.notes && <p className="text-text-2 text-xs mt-1">{t.notes}</p>}
              </div>
              <button onClick={() => removeTerm(t.id)} className="text-text-3 hover:text-text-1 text-xs shrink-0">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
