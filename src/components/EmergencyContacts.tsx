"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type EmergencyContactItem = {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  notes: string | null;
};

export function EmergencyContacts({ initial }: { initial: EmergencyContactItem[] }) {
  const router = useRouter();
  const [contacts, setContacts] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/safety/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          relationship: relationship || undefined,
          phone: phone || undefined,
          email: email || undefined,
          isPrimary,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setContacts((c) => [...c, data.contact]);
        setName("");
        setRelationship("");
        setPhone("");
        setEmail("");
        setIsPrimary(false);
        setShowForm(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(id: string) {
    setContacts((c) => c.filter((x) => x.id !== id));
    await fetch(`/api/safety/contacts/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="mono text-text-3">Emergency contacts</div>
        <button onClick={() => setShowForm((s) => !s)} className="text-xs text-text-2 hover:text-text-1">
          {showForm ? "Cancel" : "+ Add contact"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addContact} className="card p-4 space-y-3 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="field-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="field-input" placeholder="Relationship (e.g. Parent, Guardian)" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
            <input className="field-input" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="field-input" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-text-2">
            <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
            Primary contact
          </label>
          <button type="submit" disabled={saving || !name.trim()} className="btn-primary">
            {saving ? "Adding…" : "Add contact"}
          </button>
        </form>
      )}

      {contacts.length === 0 && !showForm ? (
        <p className="text-text-2 text-sm">No emergency contacts on file yet.</p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 text-sm card p-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.name}</span>
                  {c.relationship && <span className="text-text-3 text-xs">{c.relationship}</span>}
                  {c.isPrimary && <span className="badge">Primary</span>}
                </div>
                <p className="text-text-2 text-xs mt-1">
                  {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact info on file"}
                </p>
              </div>
              <button onClick={() => removeContact(c.id)} className="text-text-3 hover:text-text-1 text-xs shrink-0">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
