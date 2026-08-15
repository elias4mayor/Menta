"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AcademicGoalItem = {
  id: string;
  title: string;
  description: string | null;
  progress: number;
  status: string;
  targetDate: string | null;
};

export function AcademicGoals({ initial }: { initial: AcademicGoalItem[] }) {
  const router = useRouter();
  const [goals, setGoals] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/academics/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || undefined, targetDate: targetDate || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setGoals((g) => [data.goal, ...g]);
        setTitle("");
        setDescription("");
        setTargetDate("");
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProgress(id: string, progress: number) {
    setGoals((g) => g.map((goal) => (goal.id === id ? { ...goal, progress } : goal)));
    await fetch(`/api/academics/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress, status: progress >= 100 ? "COMPLETED" : "ACTIVE" }),
    });
    router.refresh();
  }

  async function removeGoal(id: string) {
    setGoals((g) => g.filter((goal) => goal.id !== id));
    await fetch(`/api/academics/goals/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const active = goals.filter((g) => g.status === "ACTIVE");
  const other = goals.filter((g) => g.status !== "ACTIVE");

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="mono text-text-3">Academic goals</div>
        <button onClick={() => setShowForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
          {showForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addGoal} className="space-y-2 mb-4">
          <input className="field-input" placeholder="Goal (e.g. Raise GPA, finish missing assignments)" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <textarea className="field-textarea" rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="date" className="field-input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Saving…" : "Add goal"}
          </button>
        </form>
      )}

      {active.length === 0 && !showForm ? (
        <p className="text-text-2 text-sm">No active academic goals yet.</p>
      ) : (
        <ul className="space-y-3">
          {active.map((g) => (
            <li key={g.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <button className="text-left" onClick={() => setExpanded(expanded === g.id ? null : g.id)}>
                  {g.title}
                </button>
                <button onClick={() => removeGoal(g.id)} className="text-text-3 hover:text-text-1 text-xs">
                  Remove
                </button>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full" style={{ width: `${g.progress}%`, background: "var(--grad-signal)" }} />
              </div>
              {expanded === g.id && (
                <div className="mt-2 space-y-2">
                  {g.description && <p className="text-text-2 text-xs">{g.description}</p>}
                  {g.targetDate && (
                    <p className="mono text-text-3">Target: {new Date(g.targetDate).toLocaleDateString()}</p>
                  )}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={g.progress}
                    onChange={(e) => updateProgress(g.id, Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="mono text-text-3">{g.progress}% complete</div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {other.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <div className="mono text-text-3 mb-2">Completed / paused ({other.length})</div>
          <ul className="space-y-1 text-sm text-text-2">
            {other.map((g) => (
              <li key={g.id}>{g.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
