"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type SafetyChecklistItemData = {
  id: string;
  category: string;
  title: string;
  status: string;
  notes: string | null;
};

const CATEGORIES = [
  { value: "MEDICAL_INFO", label: "Medical information" },
  { value: "EMERGENCY_CONTACTS", label: "Emergency contacts" },
  { value: "VENUE_AWARENESS", label: "Venue awareness" },
  { value: "COMMUNICATION_PLAN", label: "Communication plan" },
  { value: "DOCUMENTATION", label: "Documentation" },
  { value: "OTHER", label: "Other" },
];

const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

function statusLabel(s: string) {
  return s.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
}

export function SafetyChecklist({ initial }: { initial: SafetyChecklistItemData[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("MEDICAL_INFO");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/safety/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title }),
      });
      const data = await res.json();
      if (res.ok) {
        setItems((i) => [...i, data.item]);
        setTitle("");
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    setItems((i) => i.map((x) => (x.id === id ? { ...x, status } : x)));
    await fetch(`/api/safety/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function removeItem(id: string) {
    setItems((i) => i.filter((x) => x.id !== id));
    await fetch(`/api/safety/checklist/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const grouped = CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.category === c.value) })).filter(
    (c) => c.items.length > 0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="mono text-text-3">Your safety checklist ({items.length})</div>
        <button onClick={() => setShowForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
          {showForm ? "Cancel" : "+ Add item"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addItem} className="card p-4 space-y-3 mb-4">
          <div>
            <label className="field-label" htmlFor="safety-category">Category</label>
            <select id="safety-category" className="field-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="safety-title">Item</label>
            <input id="safety-title" className="field-input" placeholder="e.g. Know the location of the nearest AED" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <button type="submit" disabled={saving || !title.trim()} className="btn-primary">
            {saving ? "Adding…" : "Add item"}
          </button>
        </form>
      )}

      {items.length === 0 && !showForm ? (
        <p className="text-text-2 text-sm">No checklist items yet. Add the things you want to prepare for.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <div key={g.value}>
              <div className="mono text-text-3 text-xs mb-2">{g.label}</div>
              <ul className="space-y-2">
                {g.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{item.title}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <select
                        className="field-select"
                        style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
                        value={item.status}
                        onChange={(e) => updateStatus(item.id, e.target.value)}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{statusLabel(s)}</option>
                        ))}
                      </select>
                      <button onClick={() => removeItem(item.id)} className="text-text-3 hover:text-text-1 text-xs">
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
