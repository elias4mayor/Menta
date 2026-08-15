"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type RecruitingContactItem = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  lastContactedAt: string | null;
};

export type RecruitingSchoolItem = {
  id: string;
  name: string;
  division: string | null;
  location: string | null;
  status: string;
  priority: number | null;
  notes: string | null;
  createdAt: string;
  contacts: RecruitingContactItem[];
};

const SCHOOL_STATUSES = [
  "TARGET",
  "INTERESTED",
  "CONTACTED",
  "RESPONDED",
  "VISIT",
  "OFFER",
  "COMMITTED",
  "NOT_PURSUING",
];

const CONTACT_STATUSES = ["NOT_CONTACTED", "CONTACTED", "RESPONDED"];

function statusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function statusBadgeStyle(status: string): React.CSSProperties {
  if (status === "OFFER" || status === "COMMITTED") return { color: "var(--success)" };
  if (status === "NOT_PURSUING") return { color: "var(--text-3)" };
  return {};
}

export function RecruitingSchools({ initial }: { initial: RecruitingSchoolItem[] }) {
  const router = useRouter();
  const [schools, setSchools] = useState(initial);
  const [showAddForm, setShowAddForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [division, setDivision] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState("");
  const [notes, setNotes] = useState("");

  async function addSchool(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/recruiting/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          division: division || undefined,
          location: location || undefined,
          priority: priority ? Number(priority) : undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSchools((s) => [...s, data.school]);
        setName("");
        setDivision("");
        setLocation("");
        setPriority("");
        setNotes("");
        setShowAddForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateSchoolStatus(id: string, status: string) {
    setSchools((s) => s.map((sc) => (sc.id === id ? { ...sc, status } : sc)));
    await fetch(`/api/recruiting/schools/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function removeSchool(id: string) {
    setSchools((s) => s.filter((sc) => sc.id !== id));
    await fetch(`/api/recruiting/schools/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function addContact(schoolId: string, contact: { name: string; title: string; email: string; phone: string; notes: string }) {
    const res = await fetch(`/api/recruiting/schools/${schoolId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: contact.name,
        title: contact.title || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        notes: contact.notes || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSchools((s) =>
        s.map((sc) => (sc.id === schoolId ? { ...sc, contacts: [...sc.contacts, data.contact] } : sc))
      );
      router.refresh();
    }
    return res.ok;
  }

  async function updateContactStatus(schoolId: string, contactId: string, status: string) {
    setSchools((s) =>
      s.map((sc) =>
        sc.id === schoolId
          ? { ...sc, contacts: sc.contacts.map((c) => (c.id === contactId ? { ...c, status } : c)) }
          : sc
      )
    );
    await fetch(`/api/recruiting/contacts/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function removeContact(schoolId: string, contactId: string) {
    setSchools((s) =>
      s.map((sc) => (sc.id === schoolId ? { ...sc, contacts: sc.contacts.filter((c) => c.id !== contactId) } : sc))
    );
    await fetch(`/api/recruiting/contacts/${contactId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="mono text-text-3">Target schools ({schools.length})</div>
        <button onClick={() => setShowAddForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
          {showAddForm ? "Cancel" : "+ Add school"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={addSchool} className="card p-4 space-y-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="school-name">School name</label>
              <input id="school-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="field-label" htmlFor="school-division">Division / level</label>
              <input id="school-division" className="field-input" placeholder="e.g. D1, D2, D3, NAIA, JUCO" value={division} onChange={(e) => setDivision(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="school-location">Location</label>
              <input id="school-location" className="field-input" placeholder="City, State" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="school-priority">Priority (1 highest – 5 lowest)</label>
              <select id="school-priority" className="field-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">Not set</option>
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="school-notes">Notes</label>
            <textarea id="school-notes" className="field-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving ? "Adding…" : "Add school"}
          </button>
        </form>
      )}

      {schools.length === 0 && !showAddForm ? (
        <div className="card p-6 text-center">
          <p className="text-text-2 text-sm mb-1">No target schools yet.</p>
          <p className="text-text-3 text-xs">
            Add a school you&rsquo;re interested in to start tracking your own recruiting process. MENTA
            doesn&rsquo;t have a connected college database yet — you add schools you&rsquo;re researching yourself.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {schools.map((school) => (
            <li key={school.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <button className="text-left flex-1" onClick={() => setExpanded(expanded === school.id ? null : school.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{school.name}</span>
                    <span className="badge" style={statusBadgeStyle(school.status)}>{statusLabel(school.status)}</span>
                    {school.priority && <span className="mono text-text-3">P{school.priority}</span>}
                  </div>
                  <p className="text-text-2 text-xs mt-1">
                    {[school.division, school.location].filter(Boolean).join(" · ") || "No division/location set"}
                    {school.contacts.length > 0 && ` · ${school.contacts.length} contact${school.contacts.length === 1 ? "" : "s"}`}
                  </p>
                </button>
                <button onClick={() => removeSchool(school.id)} className="text-text-3 hover:text-text-1 text-xs shrink-0">
                  Remove
                </button>
              </div>

              {expanded === school.id && (
                <div className="mt-4 pt-4 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <div>
                    <label className="field-label" htmlFor={`status-${school.id}`}>Status</label>
                    <select
                      id={`status-${school.id}`}
                      className="field-select"
                      value={school.status}
                      onChange={(e) => updateSchoolStatus(school.id, e.target.value)}
                    >
                      {SCHOOL_STATUSES.map((s) => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                    <p className="text-text-3 text-xs mt-1">
                      This reflects your own tracking only — MENTA never marks a status like Offer based on
                      anything other than what you enter yourself.
                    </p>
                  </div>

                  {school.notes && <p className="text-text-2 text-sm">{school.notes}</p>}

                  <RecruitingContacts
                    schoolId={school.id}
                    contacts={school.contacts}
                    onAdd={(c) => addContact(school.id, c)}
                    onStatusChange={(contactId, status) => updateContactStatus(school.id, contactId, status)}
                    onRemove={(contactId) => removeContact(school.id, contactId)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RecruitingContacts({
  schoolId,
  contacts,
  onAdd,
  onStatusChange,
  onRemove,
}: {
  schoolId: string;
  contacts: RecruitingContactItem[];
  onAdd: (c: { name: string; title: string; email: string; phone: string; notes: string }) => Promise<boolean>;
  onStatusChange: (contactId: string, status: string) => void;
  onRemove: (contactId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const ok = await onAdd({ name, title, email, phone, notes });
    setSaving(false);
    if (ok) {
      setName("");
      setTitle("");
      setEmail("");
      setPhone("");
      setNotes("");
      setShowForm(false);
    } else {
      setError("Couldn't add contact.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="mono text-text-3">Coach / recruiting contacts</div>
        <button type="button" onClick={() => setShowForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
          {showForm ? "Cancel" : "+ Add contact"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="space-y-2 mb-3" id={`contact-form-${schoolId}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="field-input" placeholder="Coach name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="field-input" placeholder="Title (e.g. Recruiting Coordinator)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="field-input" type="email" placeholder="Email (if legitimately known)" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field-input" placeholder="Phone (if legitimately known)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <textarea className="field-textarea" rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="text-text-3 text-xs">
            Only enter contact details you actually have — MENTA never generates or looks up coach information.
          </p>
          {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" disabled={saving || !name.trim()} className="btn-secondary">
            {saving ? "Adding…" : "Add contact"}
          </button>
        </form>
      )}

      {contacts.length === 0 ? (
        <p className="text-text-3 text-xs">No contacts added for this school yet.</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{c.name}</span>
                  {c.title && <span className="text-text-3 text-xs">{c.title}</span>}
                </div>
                <p className="text-text-3 text-xs">
                  {[c.email, c.phone].filter(Boolean).join(" · ") || "No contact info on file"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  className="field-select"
                  style={{ padding: "4px 8px", fontSize: 12, width: "auto" }}
                  value={c.status}
                  onChange={(e) => onStatusChange(c.id, e.target.value)}
                >
                  {CONTACT_STATUSES.map((s) => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                </select>
                <button onClick={() => onRemove(c.id)} className="text-text-3 hover:text-text-1 text-xs">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
