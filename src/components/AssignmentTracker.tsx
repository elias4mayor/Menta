"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AssignmentItem = {
  id: string;
  title: string;
  subject: string | null;
  description: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  grade: string | null;
  notes: string | null;
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];
const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

function statusLabel(s: string) {
  return s.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}

function priorityStyle(p: string): React.CSSProperties {
  if (p === "HIGH") return { color: "var(--danger)" };
  if (p === "LOW") return { color: "var(--text-3)" };
  return {};
}

type SortKey = "dueDate" | "priority" | "status";
const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export function AssignmentTracker({ initial }: { initial: AssignmentItem[] }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);

  async function addAssignment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/academics/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          subject: subject || undefined,
          description: description || undefined,
          dueDate: dueDate || undefined,
          priority,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignments((a) => [...a, data.assignment]);
        setTitle("");
        setSubject("");
        setDescription("");
        setDueDate("");
        setPriority("MEDIUM");
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setAssignments((a) => a.map((x) => (x.id === id ? { ...x, status } : x)));
    await fetch(`/api/academics/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function updateGrade(id: string, grade: string) {
    setAssignments((a) => a.map((x) => (x.id === id ? { ...x, grade } : x)));
    await fetch(`/api/academics/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade: grade || undefined }),
    });
    router.refresh();
  }

  async function removeAssignment(id: string) {
    setAssignments((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/academics/assignments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const now = useMemo(() => new Date().getTime(), []);

  const filtered = useMemo(() => {
    const list = statusFilter === "ALL" ? assignments : assignments.filter((a) => a.status === statusFilter);
    return [...list].sort((a, b) => {
      if (sortKey === "priority") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (sortKey === "status") return STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aTime - bTime;
    });
  }, [assignments, statusFilter, sortKey]);

  const overdue = filtered.filter((a) => a.status !== "COMPLETED" && a.dueDate && new Date(a.dueDate).getTime() < now);
  const upcoming = filtered.filter((a) => a.status !== "COMPLETED" && !(a.dueDate && new Date(a.dueDate).getTime() < now));
  const completed = filtered.filter((a) => a.status === "COMPLETED");

  function AssignmentRow({ a }: { a: AssignmentItem }) {
    return (
      <li className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{a.title}</span>
              {a.subject && <span className="badge">{a.subject}</span>}
              <span className="mono text-xs" style={priorityStyle(a.priority)}>{a.priority}</span>
            </div>
            <p className="text-text-3 text-xs mt-1">
              {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : "No due date"}
              {a.grade ? ` · Grade: ${a.grade}` : ""}
            </p>
            {a.description && <p className="text-text-2 text-sm mt-2">{a.description}</p>}
          </div>
          <button onClick={() => removeAssignment(a.id)} className="text-text-3 hover:text-text-1 text-xs shrink-0">
            Remove
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <select
            className="field-select"
            style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
            value={a.status}
            onChange={(e) => updateStatus(a.id, e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <input
            className="field-input"
            style={{ padding: "4px 8px", fontSize: 12, width: 100 }}
            placeholder="Grade"
            defaultValue={a.grade ?? ""}
            onBlur={(e) => { if (e.target.value !== (a.grade ?? "")) updateGrade(a.id, e.target.value); }}
          />
        </div>
      </li>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="mono text-text-3">Assignments ({assignments.length})</div>
        <div className="flex items-center gap-2">
          <select className="field-select" style={{ padding: "4px 8px", fontSize: 12, width: "auto" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <select className="field-select" style={{ padding: "4px 8px", fontSize: 12, width: "auto" }} value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="dueDate">Sort by due date</option>
            <option value="priority">Sort by priority</option>
            <option value="status">Sort by status</option>
          </select>
          <button onClick={() => setShowForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
            {showForm ? "Cancel" : "+ Add"}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={addAssignment} className="card p-4 space-y-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="field-input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <input className="field-input" placeholder="Subject / course" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <input type="date" className="field-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <select className="field-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p[0]}{p.slice(1).toLowerCase()} priority</option>
              ))}
            </select>
          </div>
          <textarea className="field-textarea" rows={2} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" disabled={saving || !title.trim()} className="btn-primary">
            {saving ? "Adding…" : "Add assignment"}
          </button>
        </form>
      )}

      {assignments.length === 0 && !showForm ? (
        <p className="text-text-2 text-sm">No assignments yet. Add your first one above.</p>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <div>
              <div className="mono text-xs mb-2" style={{ color: "var(--danger)" }}>Overdue ({overdue.length})</div>
              <ul className="space-y-2">{overdue.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul>
            </div>
          )}
          <div>
            <div className="mono text-text-3 text-xs mb-2">Upcoming ({upcoming.length})</div>
            {upcoming.length === 0 ? (
              <p className="text-text-3 text-xs">Nothing upcoming.</p>
            ) : (
              <ul className="space-y-2">{upcoming.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul>
            )}
          </div>
          {completed.length > 0 && (
            <div>
              <div className="mono text-text-3 text-xs mb-2">Completed ({completed.length})</div>
              <ul className="space-y-2">{completed.map((a) => <AssignmentRow key={a.id} a={a} />)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
